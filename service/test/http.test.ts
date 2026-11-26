import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair, type JWTVerifyGetKey } from 'jose';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { memoryChatTokenStore } from '../src/chats/memoryChatTokenStore.js';
import { openChatTokens } from '../src/chats/openChatTokens.js';
import type { Config } from '../src/config/types.js';
import { memoryDocuments } from '../src/documents/memoryDocuments.js';
import type { Documents } from '../src/documents/types.js';
import type { Deps } from '../src/feature/types.js';
import { openGate } from '../src/gates/openGate.js';
import { verifyAccess } from '../src/http/verifyAccess.js';
import { createHttpServer } from '../src/http/createHttpServer.js';
import type { TrackerProject } from '../src/linear/types.js';
import { memorySettingsStore } from '../src/settings/memorySettingsStore.js';
import type { LegacySettings, LiveSettings } from '../src/settings/types.js';
import { openSettings } from '../src/settings/openSettings.js';
import { readGates } from '../src/status/readGates.js';
import { upsertGate } from '../src/status/upsertGate.js';

const TEMPLATES = fileURLToPath(new URL('../../templates', import.meta.url));
const WEB = fileURLToPath(new URL('./fixtures/web', import.meta.url));
const FOLDER = 'documents/Flow/P-ENG-12 Export';
const STATUS = `${FOLDER}/0-status.md`;
const SPEC_DONE = '**Flagged concerns.**\n\n1. Format - Decide: Mika\n   Decision: CSV - Mika, 2026-11-20\n';
const ORIGIN = 'https://flow.example.com';
const TEAM = 'team.cloudflareaccess.com';
const AUD = 'aud-1';
const MCP_TOKEN = 't'.repeat(32);
const MCP_TOKEN_B = 'b'.repeat(32);

const config = {
  flowFolder: 'documents/Flow', templatesDir: TEMPLATES, webDir: WEB,
  access: { teamDomain: TEAM, aud: AUD },
} as Config;
const ENGINEERS = ['mika@jitera.com', 'ken@jitera.com'];
let settings: LiveSettings;

const PROJECT: TrackerProject = {
  id: 'uuid-12', identifier: 'P-ENG-12', name: 'Export', url: 'https://linear.app/x/project/export-abc',
  teams: ['ENG'], lead: { name: 'Mika', email: 'mika@jitera.com' }, flowLabel: 'flow:spec-review',
};

function fakeTracker(project: TrackerProject) {
  const t = {
    labels: project.flowLabel ? [project.flowLabel] : ([] as string[]),
    async getProject(ref: string) {
      return ref.toUpperCase() === project.identifier ? { ...project, flowLabel: t.labels[0] ?? null } : null;
    },
    async setFlowLabel(_id: string, label: string) { t.labels = [label]; },
  };
  return t;
}

const statusMd = readFileSync(`${TEMPLATES}/0-status.md`, 'utf8')
  .replaceAll('<PROJECT-ID>', 'P-ENG-12').replaceAll('<Project name>', 'Export').replaceAll('<project URL>', PROJECT.url);

let jwks: JWTVerifyGetKey;
let sign: (claims: Record<string, unknown>, opts?: { aud?: string; exp?: string | number }) => Promise<string>;
beforeAll(async () => {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  jwks = createLocalJWKSet({ keys: [{ ...(await exportJWK(publicKey)), kid: 'k1', alg: 'RS256' }] });
  sign = (claims, opts = {}) => new SignJWT(claims).setProtectedHeader({ alg: 'RS256', kid: 'k1' })
    .setIssuer(`https://${TEAM}`).setAudience(opts.aud ?? AUD).setIssuedAt().setExpirationTime(opts.exp ?? '5m').sign(privateKey);
});

let docs: Documents;
let tracker: ReturnType<typeof fakeTracker>;
let deps: Deps;
let server: Server;
let base: string;
let gate: string;
let gatePath: string;
const apiGatePath = () => `/api${gatePath}`;

async function setup(project: TrackerProject = PROJECT, publicUrl = ORIGIN) {
  settings = await openSettings(memorySettingsStore(), 'k'.repeat(32), { engineers: ENGINEERS, publicUrl }, () => new Date());
  await settings.save({ docsUrl: 'https://docs.example.com', jiteraProject: 'proj-1', tdrFolder: '', productDocs: '', compliance: '', docsToken: 'DOCS-TOKEN-AAA', linearApiKey: 'LIN-KEY-BBB', teams: ['ENG'], engineers: ENGINEERS }, 'mika@jitera.com');
  docs = memoryDocuments({ [STATUS]: statusMd, [`${FOLDER}/2-spec.md`]: SPEC_DONE });
  tracker = fakeTracker(project);
  const quiet = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const chats = await openChatTokens(memoryChatTokenStore(), 'k'.repeat(32), [{ name: 'test', token: MCP_TOKEN }, { name: 'second-agent', token: MCP_TOKEN_B }], () => new Date());
  quiet.mockRestore();
  deps = { config, settings, chats, docs, tracker, now: () => new Date() };
  gate = (await openGate(deps, 'P-ENG-12', 'flow:plan')).gate;
  gatePath = `/gate/P-ENG-12/${gate}`;
  server = createHttpServer(deps, { jwks });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}
beforeEach(() => setup());
afterEach(() => new Promise<void>((r) => server.close(() => r())));

async function serve(legacy: LegacySettings) {
  await new Promise<void>((r) => server.close(() => r()));
  settings = await openSettings(memorySettingsStore(), 'k'.repeat(32), legacy, () => new Date());
  server = createHttpServer({ ...deps, settings }, { jwks });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}
const get = (path: string, headers: Record<string, string>) => fetch(base + path, { headers, redirect: 'manual' });
const post = (path: string, body: string, headers: Record<string, string>) =>
  fetch(base + path, { method: 'POST', body, headers, redirect: 'manual' });
const initBody = JSON.stringify({
  jsonrpc: '2.0', id: 1, method: 'initialize',
  params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'c', version: '1' } },
});
const form = (v: Record<string, string>) => new URLSearchParams(v).toString();
const FORM = { 'content-type': 'application/x-www-form-urlencoded' };

describe('basics', () => {
  it('healthz says ok, unknown paths are 404', async () => {
    const r = await get('/healthz', {});
    expect(r.status).toBe(200);
    expect(await r.text()).toBe('ok');
    expect((await get('/nope', {})).status).toBe(404);
  });
  it('/ redirects to /settings', async () => {
    const r = await get('/', {});
    expect(r.status).toBe(302);
    expect(r.headers.get('location')).toBe('/settings');
  });
  it('a body over 1 MB is 413', async () => {
    expect((await post('/webhooks/gate', 'x'.repeat(1024 * 1024 + 1), {})).status).toBe(413);
  });
  it('a chunked body over 1 MB with no Content-Length is 413', async () => {
    const chunk = new Uint8Array(64 * 1024).fill(120);
    let sent = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(c) {
        if (sent++ < 20) c.enqueue(chunk); // 1.25 MB in all
        else c.close();
      },
    });
    const r = await fetch(base + '/webhooks/gate', { method: 'POST', body, duplex: 'half' } as RequestInit);
    expect(r.status).toBe(413);
  });
});

describe('/mcp', () => {
  it('rejects /mcp without the right bearer token', async () => {
    const h = { 'content-type': 'application/json', accept: 'application/json, text/event-stream' };
    expect((await post('/mcp', initBody, h)).status).toBe(401);
    expect((await post('/mcp', initBody, { ...h, authorization: 'Bearer nope' })).status).toBe(401);
    expect((await get('/mcp', { authorization: `Bearer ${MCP_TOKEN}` })).status).toBe(405);
    expect((await fetch(base + '/mcp', { method: 'DELETE' })).status).toBe(405);
  });
  it('serves MCP with a valid token', async () => {
    const client = new Client({ name: 'c', version: '1' });
    await client.connect(new StreamableHTTPClientTransport(new URL(base + '/mcp'), {
      requestInit: { headers: { authorization: `Bearer ${MCP_TOKEN}` } },
    }));
    expect((await client.listTools()).tools).toHaveLength(8);
    await client.close();
  });
  it('the token picks the client: token B acts as client B', async () => {
    const client = new Client({ name: 'c', version: '1' });
    await client.connect(new StreamableHTTPClientTransport(new URL(base + '/mcp'), {
      requestInit: { headers: { authorization: `Bearer ${MCP_TOKEN_B}` } },
    }));
    const r = await client.callTool({ name: 'log_stage', arguments: { project: 'P-ENG-12', stage: 'Spec', status: 'done', note: 'hello' } });
    expect(r.isError).toBeFalsy();
    expect(await docs.read(STATUS)).toContain('- Spec - Flow agent (second-agent) - hello');
    await client.close();
  });
  it('a token created on /settings works at once, and a revoked one is 401 at once', async () => {
    const { chat, token } = await deps.chats.create('fresh', 'mika@jitera.com');
    const h = { 'content-type': 'application/json', accept: 'application/json, text/event-stream', authorization: `Bearer ${token}` };
    expect((await post('/mcp', initBody, h)).status).toBe(200);
    expect(deps.chats.list().find((c) => c.id === chat.id)?.lastUsedAt).not.toBeNull();
    expect(await deps.chats.revoke(chat.id)).toBe(true);
    expect((await post('/mcp', initBody, h)).status).toBe(401);
  });
});

describe('verifyAccess', () => {
  it('returns the lowercased email, or null', async () => {
    const opts = { teamDomain: TEAM, aud: AUD, jwks };
    expect(await verifyAccess(await sign({ email: 'Mika@Jitera.com' }), opts)).toBe('mika@jitera.com');
    expect(await verifyAccess(undefined, opts)).toBeNull();
    expect(await verifyAccess('junk', opts)).toBeNull();
    expect(await verifyAccess(await sign({ email: 'mika@jitera.com' }, { aud: 'other' }), opts)).toBeNull();
    expect(await verifyAccess(await sign({ email: 'mika@jitera.com' }, { exp: Math.floor(Date.now() / 1000) - 60 }), opts)).toBeNull();
    expect(await verifyAccess(await sign({}), opts)).toBeNull();
    expect(await verifyAccess(await sign({ email: 'mika@jitera.com' }), { ...opts, teamDomain: 'evil.example.com' })).toBeNull();
  });
});

const as = async (email: string) => ({ 'cf-access-jwt-assertion': await sign({ email }) });
const JSON_H = { 'content-type': 'application/json' };
const MIKA = 'mika@jitera.com';
const apiPost = async (path: string, body: unknown, email = MIKA, extra: Record<string, string> = {}) =>
  post(path, JSON.stringify(body), { ...JSON_H, origin: ORIGIN, ...(await as(email)), ...extra });
const expectApiHeaders = (r: Response) => {
  expect(r.headers.get('content-type')).toBe('application/json');
  expect(r.headers.get('cache-control')).toBe('no-store');
};

describe('GET /api/gate', () => {
  it('needs a valid Access JWT', async () => {
    const r = await get(apiGatePath(), {});
    expect(r.status).toBe(401);
    expectApiHeaders(r);
    expect(await r.json()).toEqual({ error: 'sign_in' });
    const wrongAud = await sign({ email: MIKA }, { aud: 'other' });
    expect((await get(apiGatePath(), { 'cf-access-jwt-assertion': wrongAud })).status).toBe(401);
  });
  it('the owner gets the gate data and can decide', async () => {
    const r = await get(apiGatePath(), await as('Mika@Jitera.com'));
    expect(r.status).toBe(200);
    expectApiHeaders(r);
    expect(await r.json()).toEqual({
      email: MIKA, project: 'P-ENG-12', feature: 'Export', from: 'Spec review', to: 'Plan', toLabel: 'flow:plan',
      roles: ['owner'], approvals: [], canDecide: true, reason: null,
    });
  });
  it('a row with a bad signature gives the reason and no decision', async () => {
    const md = (await docs.read(STATUS))!;
    const row = readGates(md)[0]!;
    await docs.update(STATUS, upsertGate(md, { ...row, roles: ['engineer'] }));
    const body = await (await get(apiGatePath(), await as('ken@jitera.com'))).json();
    expect(body).toMatchObject({ canDecide: false, reason: 'This gate was changed by hand. Open a new one.' });
  });
  it('someone who cannot decide gets the reason', async () => {
    const body = await (await get(apiGatePath(), await as('ken@jitera.com'))).json();
    expect(body).toMatchObject({ canDecide: false, reason: 'ken@jitera.com cannot decide this gate.' });
  });
  it('someone who already approved gets the reason', async () => {
    const tdr = (await openGate(deps, 'P-ENG-12', 'flow:tdr')).gate;
    const path = `/api/gate/P-ENG-12/${tdr}`;
    const r = await apiPost(path, { decision: 'approve', to: 'flow:tdr' });
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ approvals: [{ role: 'owner', email: MIKA }], canDecide: false, reason: 'You already approved this gate.' });
  });
  it('an unknown project or gate is 404', async () => {
    const h = await as(MIKA);
    const r = await get('/api/gate/P-ENG-12/gnope', h);
    expect(r.status).toBe(404);
    expectApiHeaders(r);
    expect(await r.json()).toMatchObject({ error: 'not_found', message: expect.stringContaining('gnope') });
    const p = await get(`/api/gate/P-ENG-99/${gate}`, h);
    expect(p.status).toBe(404);
    expect((await p.json()).error).toBe('not_found');
  });
});

describe('POST /api/gate', () => {
  it('a POST from another site changes nothing', async () => {
    const body = { decision: 'approve', to: 'flow:plan' };
    const noOrigin = await post(apiGatePath(), JSON.stringify(body), { ...JSON_H, ...(await as(MIKA)) });
    expect(noOrigin.status).toBe(403);
    expectApiHeaders(noOrigin);
    expect(await noOrigin.json()).toEqual({ error: 'refused' });
    expect((await apiPost(apiGatePath(), body, MIKA, { origin: 'https://evil.example.com' })).status).toBe(403);
    const text = await apiPost(apiGatePath(), body, MIKA, { 'content-type': 'text/plain' });
    expect(text.status).toBe(415);
    expect(await text.json()).toEqual({ error: 'json_only' });
    expect((await post(apiGatePath(), 'decision=approve&to=flow%3Aplan', { ...FORM, origin: ORIGIN, ...(await as(MIKA)) })).status).toBe(415);
    expect((await post(apiGatePath(), JSON.stringify(body), { ...JSON_H, origin: ORIGIN })).status).toBe(401);
    const maybe = await apiPost(apiGatePath(), { decision: 'maybe', to: 'flow:plan' });
    expect(maybe.status).toBe(400);
    expect((await maybe.json()).error).toBe('invalid');
    expect(tracker.labels).toEqual(['flow:spec-review']);
    expect(readGates((await docs.read(STATUS))!)[0]!.status).toBe('open');
  });
  it('the owner approves, a second approve is 409 closed', async () => {
    const r = await apiPost(apiGatePath(), { decision: 'approve', to: 'flow:plan' }, 'Mika@jitera.com');
    expect(r.status).toBe(200);
    expectApiHeaders(r);
    expect(await r.json()).toMatchObject({ canDecide: false, reason: 'This gate is closed (approved).', approvals: [{ role: 'owner', email: MIKA }] });
    expect(tracker.labels).toEqual(['flow:plan']);
    expect(await docs.read(STATUS)).toContain('Spec review approved - mika@jitera.com via page');
    const again = await apiPost(apiGatePath(), { decision: 'approve', to: 'flow:plan' });
    expect(again.status).toBe(409);
    expect(await again.json()).toMatchObject({ error: 'closed', message: expect.any(String) });
  });
  it('the owner requests changes', async () => {
    const r = await apiPost(apiGatePath(), { decision: 'changes', to: 'flow:plan' });
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({ canDecide: false, reason: 'This gate is closed (changes requested).' });
    expect(tracker.labels).toEqual(['flow:spec-review']);
    expect(await docs.read(STATUS)).toContain('Spec review changes requested - mika@jitera.com via page');
  });
  it('a POST for another move than the gate is 409 mismatch', async () => {
    const r = await apiPost(apiGatePath(), { decision: 'approve', to: 'flow:tdr' });
    expect(r.status).toBe(409);
    expect((await r.json()).error).toBe('mismatch');
    expect(tracker.labels).toEqual(['flow:spec-review']);
  });
  it('someone who cannot decide is 409 not_allowed', async () => {
    const r = await apiPost(apiGatePath(), { decision: 'approve', to: 'flow:plan' }, 'ken@jitera.com');
    expect(r.status).toBe(409);
    expect((await r.json()).error).toBe('not_allowed');
    expect(tracker.labels).toEqual(['flow:spec-review']);
  });
  it('an unknown gate is 404', async () => {
    const r = await apiPost('/api/gate/P-ENG-12/gnope', { decision: 'approve', to: 'flow:plan' });
    expect(r.status).toBe(404);
    expect((await r.json()).error).toBe('not_found');
  });
  it('the origin check normalizes case and the default port of publicUrl', async () => {
    server.close();
    await setup(PROJECT, 'https://Flow.Example.COM:443');
    expect((await apiPost(apiGatePath(), { decision: 'approve', to: 'flow:plan' })).status).toBe(200);
    expect(tracker.labels).toEqual(['flow:plan']);
  });
});

describe('gate webhook', () => {
  const now = () => Math.floor(Date.now() / 1000);
  const hook = (body: string, o: { secret?: string; ts?: number | string } = {}) => {
    const ts = String(o.ts ?? now());
    const sig = createHmac('sha256', o.secret ?? MCP_TOKEN).update(`${ts}.${body}`).digest('hex');
    return post('/webhooks/gate', body, { 'content-type': 'application/json', 'x-jflow-timestamp': ts, 'x-jflow-signature': `sha256=${sig}` });
  };
  const bodyOf = (v: Record<string, string>) =>
    JSON.stringify({ gate, project: 'P-ENG-12', decision: 'approve', email: 'Mika@Jitera.com', source: 'chat', to: 'flow:plan', ...v });

  it('the gate webhook checks the signature and the clock', async () => {
    const body = bodyOf({});
    expect((await hook(body, { secret: 'w'.repeat(32) })).status).toBe(401);
    expect((await hook(body, { ts: now() - 301 })).status).toBe(401);
    expect((await hook(body, { ts: now() + 301 })).status).toBe(401);
    expect((await hook(body, { ts: 'soon' })).status).toBe(401);
    expect(tracker.labels).toEqual(['flow:spec-review']);
    const ok = await hook(body, { secret: MCP_TOKEN_B }); // any MCP client's token signs
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ status: 'approved', missing: [] });
    expect(tracker.labels).toEqual(['flow:plan']);
    expect(await docs.read(STATUS)).toContain('Spec review approved - mika@jitera.com via chat');
    const r = await hook(body);
    expect(r.status).toBe(409); // closed now
    expect(await r.json()).toEqual({ error: 'closed' });
  });
  it('a revoked token no longer signs; a live one does', async () => {
    const revoked = await deps.chats.create('gone', 'mika@jitera.com');
    await deps.chats.revoke(revoked.chat.id);
    expect((await hook(bodyOf({}), { secret: revoked.token })).status).toBe(401);
    const live = await deps.chats.create('live', 'mika@jitera.com');
    expect((await hook(bodyOf({}), { secret: live.token })).status).toBe(200);
  });
  it('a partial approval answers open with the missing role', async () => {
    const tdr = (await openGate(deps, 'P-ENG-12', 'flow:tdr')).gate;
    const send = (email: string) => hook(bodyOf({ gate: tdr, to: 'flow:tdr', email }));
    for (const _ of [1, 2]) {
      const r = await send('ken@jitera.com');
      expect(r.status).toBe(200);
      expect(await r.json()).toEqual({ status: 'open', missing: ['owner'] });
      expect(tracker.labels).toEqual(['flow:spec-review']);
    }
    const done = await send(MIKA);
    expect(done.status).toBe(200);
    expect(await done.json()).toEqual({ status: 'approved', missing: [] });
    expect(tracker.labels).toEqual(['flow:tdr']);
  });
  it('request changes answers changes requested', async () => {
    const r = await hook(bodyOf({ decision: 'changes', email: MIKA }));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ status: 'changes requested', missing: ['owner'] });
  });
  it('a signed bad body is 400', async () => {
    const r = await hook(bodyOf({ decision: 'maybe' }));
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({ error: 'invalid_body' });
    expect((await hook('not json')).status).toBe(400);
    const empty = await hook(bodyOf({ email: '' }));
    expect(empty.status).toBe(400);
    expect(await empty.json()).toEqual({ error: 'invalid_body' });
    for (const bad of [{ to: '' }, { to: 'plan' }, { source: 'a|b' }, { source: 'a\nb' }, { source: 'a\rb' }]) {
      const res = await hook(bodyOf(bad));
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: 'invalid_body' });
    }
    const { to: _to, ...noTo } = JSON.parse(bodyOf({}));
    expect((await hook(JSON.stringify(noTo))).status).toBe(400);
    expect(tracker.labels).toEqual(['flow:spec-review']);
  });
  it('a webhook for another move than the gate is 409 mismatch', async () => {
    const r = await hook(bodyOf({ to: 'flow:tdr' }));
    expect(r.status).toBe(409);
    expect(await r.json()).toEqual({ error: 'mismatch' });
    expect(tracker.labels).toEqual(['flow:spec-review']);
    expect(readGates((await docs.read(STATUS))!)[0]!.status).toBe('open');
  });
  it('an unknown gate on the webhook is 404', async () => {
    const r = await hook(bodyOf({ gate: 'gnope' }));
    expect(r.status).toBe(404);
    expect(await r.json()).toEqual({ error: 'not_found' });
    expect((await hook(bodyOf({ project: 'P-ENG-99' }))).status).toBe(404);
  });
});


describe('/api/settings', () => {
  const GOOD = { docsUrl: 'https://docs.example.com', jiteraProject: 'proj-1', teams: ['ENG'], engineers: ENGINEERS };
  const save = (v: Record<string, unknown>, email = MIKA, extra: Record<string, string> = {}) =>
    apiPost('/api/settings', { ...GOOD, ...v }, email, extra);
  const unchanged = () => {
    expect(settings.get().docsUrl).toBe('https://docs.example.com');
    expect(settings.get().engineers).toEqual(ENGINEERS);
  };

  it('GET without Access is 401, as a non-engineer is 403', async () => {
    const r = await get('/api/settings', {});
    expect(r.status).toBe(401);
    expect(await r.json()).toEqual({ error: 'sign_in' });
    const eve = await get('/api/settings', await as('eve@jitera.com'));
    expect(eve.status).toBe(403);
    expectApiHeaders(eve);
    expect(await eve.json()).toEqual({ error: 'not_allowed', message: 'Only jflow engineers can open settings. Ask an engineer to add you.' });
  });
  it('GET as an engineer gives the values and no secret', async () => {
    const r = await get('/api/settings', await as(MIKA));
    expect(r.status).toBe(200);
    expectApiHeaders(r);
    const text = await r.text();
    expect(text).not.toContain('DOCS-TOKEN-AAA');
    expect(text).not.toContain('LIN-KEY-BBB');
    expect(JSON.parse(text)).toEqual({
      email: MIKA,
      settings: {
        docsUrl: 'https://docs.example.com', jiteraProject: 'proj-1', docsTokenSet: true, linearApiKeySet: true,
        teams: ['ENG'], engineers: ENGINEERS, updatedBy: MIKA, updatedAt: expect.any(String),
        publicUrl: ORIGIN, tdrFolder: '', productDocs: '', compliance: '',
      },
    });
  });
  it('the view never carries the gate secret', async () => {
    const secret = settings.get().gateSecret;
    expect(secret).not.toBe('');
    const view = await (await get('/api/settings', await as(MIKA))).text();
    const saved = await (await save({})).text();
    expect(view).not.toContain(secret);
    expect(saved).not.toContain(secret);
    expect(view).not.toContain('gateSecret');
  });
  it('POST carries the team settings, and a body that omits them keeps the stored values', async () => {
    const r = await save({ tdrFolder: 'TDR', productDocs: 'Specs', compliance: 'ISMAP' });
    expect((await r.json()).settings).toMatchObject({ tdrFolder: 'TDR', productDocs: 'Specs', compliance: 'ISMAP' });
    expect((await save({ docsUrl: 'https://docs.example.com' })).status).toBe(200);
    expect(settings.get()).toMatchObject({ tdrFolder: 'TDR', productDocs: 'Specs', compliance: 'ISMAP' });
    expect((await save({ tdrFolder: '' })).status).toBe(200);
    expect(settings.get()).toMatchObject({ tdrFolder: '', productDocs: 'Specs', compliance: 'ISMAP' });
  });
  it('POST saves publicUrl as a normalized origin and refuses a bad one', async () => {
    expect((await save({ publicUrl: 'https://flow.example.com/' })).status).toBe(200);
    expect(settings.get().publicUrl).toBe(ORIGIN);
    const r = await save({ publicUrl: 'HTTPS://New.Example.com:443/' });
    expect(r.status).toBe(200);
    expect((await r.json()).settings.publicUrl).toBe('https://new.example.com');
  });
  it('ctx.origin follows a publicUrl saved at runtime', async () => {
    expect((await save({ publicUrl: 'https://new.example.com' })).status).toBe(200);
    expect((await save({ docsUrl: 'https://x.example.com' })).status).toBe(403);
    expect((await save({ docsUrl: 'https://x.example.com' }, MIKA, { origin: 'https://new.example.com' })).status).toBe(200);
    expect(settings.get().docsUrl).toBe('https://x.example.com');
  });
  it('once publicUrl is set, a POST from another origin is refused', async () => {
    const r = await save({ publicUrl: 'https://other.example.com' }, MIKA, { origin: 'https://other.example.com' });
    expect(r.status).toBe(403);
    expect(await r.json()).toEqual({ error: 'refused' });
    expect(settings.get().publicUrl).toBe(ORIGIN);
  });
  it('the first save takes publicUrl from the page origin when none is set', async () => {
    await serve({ engineers: ENGINEERS });
    const r = await save({}, MIKA, { origin: 'https://flow.example.com' });
    expect(r.status).toBe(200);
    expect((await r.json()).settings.publicUrl).toBe('https://flow.example.com');
    expect(settings.get().publicUrl).toBe('https://flow.example.com');
  });
  it('with no publicUrl, a POST with no Origin is refused', async () => {
    await serve({ engineers: ENGINEERS });
    const r = await post('/api/settings', JSON.stringify(GOOD), { ...JSON_H, ...(await as(MIKA)) });
    expect(r.status).toBe(403);
    expect(settings.get().publicUrl).toBe('');
  });
  it('the first person to open settings on an empty instance becomes an engineer', async () => {
    await serve({});
    const a = await get('/api/settings', await as('a@x.com'));
    expect(a.status).toBe(200);
    expect(settings.get().engineers).toEqual(['a@x.com']);
    const b = await get('/api/settings', await as('b@x.com'));
    expect(b.status).toBe(403);
    expect((await b.json()).error).toBe('not_allowed');
    expect(settings.get().engineers).toEqual(['a@x.com']);
  });
  it('POST saves, keeps blank secrets, cleans teams and engineers', async () => {
    const r = await save({ teams: [' core', 'eng', 'ENG', ''], engineers: ['Mika@Jitera.com ', 'ken@jitera.com', 'mika@jitera.com', ' '], docsToken: '', linearApiKey: '  ', docsUrl: ' https://docs.example.com ' });
    expect(r.status).toBe(200);
    expectApiHeaders(r);
    expect((await r.json()).settings).toMatchObject({ teams: ['CORE', 'ENG'], engineers: ENGINEERS, docsTokenSet: true, linearApiKeySet: true });
    expect(settings.get().teams).toEqual(['CORE', 'ENG']);
    expect(settings.get().engineers).toEqual(ENGINEERS);
    expect(settings.get().docsUrl).toBe('https://docs.example.com');
    expect(settings.get().docsToken).toBe('DOCS-TOKEN-AAA');
    expect(settings.get().linearApiKey).toBe('LIN-KEY-BBB');
  });
  it('POST upper-cases teams and keeps a missing secret', async () => {
    expect((await save({ teams: ['core', 'eng'] })).status).toBe(200);
    expect(settings.get().teams).toEqual(['CORE', 'ENG']);
    expect(settings.get().docsToken).toBe('DOCS-TOKEN-AAA');
  });
  it('POST with a new docs token replaces it', async () => {
    expect((await save({ docsToken: 'NEW-TOKEN' })).status).toBe(200);
    expect(settings.get().docsToken).toBe('NEW-TOKEN');
    expect(settings.get().linearApiKey).toBe('LIN-KEY-BBB');
  });
  it('POST from another site changes nothing', async () => {
    const v = { docsUrl: 'https://x.example.com' };
    const evil = await save(v, MIKA, { origin: 'https://evil.example.com' });
    expect(evil.status).toBe(403);
    expect(await evil.json()).toEqual({ error: 'refused' });
    const text = await save(v, MIKA, { 'content-type': 'text/plain' });
    expect(text.status).toBe(415);
    expectApiHeaders(text);
    expect(await text.json()).toEqual({ error: 'json_only' });
    const formPost = await post('/api/settings', form({ ...GOOD, teams: 'ENG', engineers: ENGINEERS.join('\n'), ...v }), { ...FORM, origin: ORIGIN, ...(await as(MIKA)) });
    expect(formPost.status).toBe(415);
    unchanged();
  });
  it('POST with a bad body is 400', async () => {
    const r = await save({ teams: 'ENG' });
    expect(r.status).toBe(400);
    const body = await r.json();
    expect(body.error).toBe('invalid');
    expect(body.problems.length).toBeGreaterThan(0);
    const junk = await post('/api/settings', 'not json', { ...JSON_H, origin: ORIGIN, ...(await as(MIKA)) });
    expect(junk.status).toBe(400);
    expect((await junk.json()).error).toBe('invalid');
    unchanged();
  });
  it('POST over the body limit is 413', async () => {
    const chunk = new TextEncoder().encode(JSON.stringify({ ...GOOD, docsUrl: 'x'.repeat(64 * 1024) }));
    let sent = 0;
    const body = new ReadableStream<Uint8Array>({
      pull(c) {
        if (sent++ < 20) c.enqueue(chunk); // over 1 MB in all
        else c.close();
      },
    });
    const r = await fetch(base + '/api/settings', {
      method: 'POST', body, duplex: 'half', headers: { ...JSON_H, origin: ORIGIN, ...(await as(MIKA)) },
    } as RequestInit);
    expect(r.status).toBe(413);
    expectApiHeaders(r);
    unchanged();
  });
  it('POST that removes the saver is 400 and changes nothing', async () => {
    const r = await save({ engineers: ['ken@jitera.com'], docsUrl: 'https://typed.example.com', docsToken: 'TYPED-SECRET' });
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({ error: 'invalid', problems: ['you cannot remove yourself from engineers'] });
    unchanged();
    expect(settings.get().docsToken).toBe('DOCS-TOKEN-AAA');
  });
  it('POST from a non-engineer is 403 and changes nothing', async () => {
    const r = await save({ docsUrl: 'https://x.example.com' }, 'eve@jitera.com');
    expect(r.status).toBe(403);
    expect((await r.json()).error).toBe('not_allowed');
    unchanged();
  });
  it('POST with no engineers is 400 and changes nothing', async () => {
    const r = await save({ engineers: [], docsUrl: 'https://x.example.com' });
    expect(r.status).toBe(400);
    expect((await r.json()).problems).toContain('keep at least one engineer');
    unchanged();
  });
  it('no secret in responses or logs, and the save is logged', async () => {
    const logs: string[] = [];
    const spies = (['log', 'error'] as const).map((k) => {
      const orig = console[k];
      console[k] = (...a: unknown[]) => void logs.push(a.join(' '));
      return () => { console[k] = orig; };
    });
    try {
      const ok = await save({ docsToken: 'SECRET-NEW-1' });
      const bad = await save({ docsToken: 'SECRET-NEW-2', engineers: ['ken@jitera.com'] });
      const bodies = (await ok.text()) + (await bad.text()) + (await (await get('/api/settings', await as(MIKA))).text());
      expect(ok.status).toBe(200);
      expect(bad.status).toBe(400);
      expect(logs).toContain('jflow: settings saved by mika@jitera.com');
      for (const t of ['SECRET-NEW-1', 'SECRET-NEW-2', 'DOCS-TOKEN-AAA', 'LIN-KEY-BBB']) {
        expect(bodies).not.toContain(t);
        expect(logs.join('\n')).not.toContain(t);
      }
    } finally {
      spies.forEach((u) => u());
    }
  });
});

describe('web app files', () => {
  const INDEX = readFileSync(`${WEB}/index.html`, 'utf8');
  it('app routes serve index.html with the page headers', async () => {
    for (const path of ['/settings', '/gate/P-ENG-12/gX']) {
      const r = await get(path, {});
      expect(r.status).toBe(200);
      expect(await r.text()).toBe(INDEX);
      expect(r.headers.get('content-type')).toBe('text/html; charset=utf-8');
      expect(r.headers.get('cache-control')).toBe('no-store');
      expect(r.headers.get('x-frame-options')).toBe('DENY');
      expect(r.headers.get('content-security-policy'))
        .toBe("default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self'; frame-ancestors 'none'");
    }
  });
  it('serves an asset with its type and a long cache', async () => {
    const r = await get('/assets/app.js', {});
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toMatch(/^text\/javascript/);
    expect(r.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
    expect(await r.text()).toBe(readFileSync(`${WEB}/assets/app.js`, 'utf8'));
  });
  it('never reads outside the assets folder', async () => {
    for (const path of ['/assets/..%2F..%2Fpackage.json', '/assets/../index.html', '/assets/%2e%2e%2findex.html', '/assets/..%5Cindex.html',
      '/assets/', '/assets/nope.js', '/assets/%E0%A4%A', '/assets/a%00.js']) {
      const r = await fetch(base + path);
      expect(r.status, path).toBe(404);
      expect(await r.text()).not.toContain('<div id="root">');
    }
  });
  it('the old form posts are gone', async () => {
    expect((await post('/settings', 'x=1', FORM)).status).toBe(404);
    expect((await post(gatePath, 'x=1', FORM)).status).toBe(404);
  });
});
