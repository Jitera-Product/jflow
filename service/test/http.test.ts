import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair, type JWTVerifyGetKey } from 'jose';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Config } from '../src/config/types.js';
import { memoryDocuments } from '../src/documents/memoryDocuments.js';
import type { Documents } from '../src/documents/types.js';
import type { Deps } from '../src/feature/types.js';
import { openGate } from '../src/gates/openGate.js';
import { verifyAccess } from '../src/http/verifyAccess.js';
import { createHttpServer } from '../src/http/createHttpServer.js';
import type { TrackerProject } from '../src/linear/types.js';
import { readGates } from '../src/status/readGates.js';
import { upsertGate } from '../src/status/upsertGate.js';

const TEMPLATES = fileURLToPath(new URL('../../templates', import.meta.url));
const FOLDER = 'documents/Flow/P-ENG-12 Export';
const STATUS = `${FOLDER}/0-status.md`;
const SPEC_DONE = '**Flagged concerns.**\n\n1. Format - Decide: Mika\n   Decision: CSV - Mika, 2026-11-20\n';
const ORIGIN = 'https://flow.example.com';
const TEAM = 'team.cloudflareaccess.com';
const AUD = 'aud-1';
const MCP_TOKEN = 't'.repeat(32);
const MCP_TOKEN_B = 'b'.repeat(32);
const CALLBACK = 'c'.repeat(32);

const config = {
  publicUrl: ORIGIN, flowFolder: 'documents/Flow', templatesDir: TEMPLATES,
  teams: ['ENG'], engineers: ['mika@jitera.com', 'ken@jitera.com'],
  access: { teamDomain: TEAM, aud: AUD },
  gateSecret: 's'.repeat(32), callbackSecret: CALLBACK,
  mcpClients: [{ name: 'test', token: MCP_TOKEN }, { name: 'second-agent', token: MCP_TOKEN_B }],
} as Config;

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

async function setup(project: TrackerProject = PROJECT, cfg: Config = config) {
  docs = memoryDocuments({ [STATUS]: statusMd, [`${FOLDER}/2-spec.md`]: SPEC_DONE });
  tracker = fakeTracker(project);
  deps = { config: cfg, docs, tracker, now: () => new Date() };
  gate = (await openGate(deps, 'P-ENG-12', 'flow:plan')).gate;
  gatePath = `/gate/P-ENG-12/${gate}`;
  server = createHttpServer(deps, { jwks });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}
beforeEach(() => setup());
afterEach(() => new Promise<void>((r) => server.close(() => r())));

const get = (path: string, headers: Record<string, string>) => fetch(base + path, { headers, redirect: 'manual' });
const post = (path: string, body: string, headers: Record<string, string>) =>
  fetch(base + path, { method: 'POST', body, headers, redirect: 'manual' });
const initBody = JSON.stringify({
  jsonrpc: '2.0', id: 1, method: 'initialize',
  params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'c', version: '1' } },
});
const CSRF_KEY = createHmac('sha256', config.gateSecret).update('jflow-csrf').digest();
const csrfOf = (g: string, email: string) => createHmac('sha256', CSRF_KEY).update(`csrf|${g}|${email}`).digest('hex');
const form = (v: Record<string, string>) => new URLSearchParams(v).toString();
const FORM = { 'content-type': 'application/x-www-form-urlencoded' };

describe('basics', () => {
  it('healthz says ok, unknown paths are 404', async () => {
    const r = await get('/healthz', {});
    expect(r.status).toBe(200);
    expect(await r.text()).toBe('ok');
    expect((await get('/nope', {})).status).toBe(404);
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

describe('confirm page', () => {
  it('the confirm page needs a valid Access JWT', async () => {
    expect((await get(gatePath, {})).status).toBe(401);
    const wrongAud = await sign({ email: 'mika@jitera.com' }, { aud: 'other' });
    expect((await get(gatePath, { 'cf-access-jwt-assertion': wrongAud })).status).toBe(401);
    const r = await get(gatePath, { 'cf-access-jwt-assertion': await sign({ email: 'Mika@Jitera.com' }) });
    expect(r.status).toBe(200);
    const html = await r.text();
    expect(html).toContain('>Approve</button>');
    expect(html).toContain('>Request changes</button>');
    expect(html).toContain('Spec review -&gt; Plan');
    expect(html).toContain('mika@jitera.com');
    expect(html).toContain(`value="${csrfOf(gate, 'mika@jitera.com')}"`);
    expect(html).toContain('name="to" value="flow:plan"');
  });
  it('a row with a bad signature shows the reason, not the buttons', async () => {
    const md = (await docs.read(STATUS))!;
    const row = readGates(md)[0]!;
    await docs.update(STATUS, upsertGate(md, { ...row, roles: ['engineer'] }));
    const html = await (await get(gatePath, { 'cf-access-jwt-assertion': await sign({ email: 'ken@jitera.com' }) })).text();
    expect(html).not.toContain('<button');
    expect(html).toContain('This gate was changed by hand.');
  });
  it('someone who cannot decide sees the reason, not the buttons', async () => {
    const html = await (await get(gatePath, { 'cf-access-jwt-assertion': await sign({ email: 'ken@jitera.com' }) })).text();
    expect(html).not.toContain('<button');
    expect(html).toContain('ken@jitera.com cannot decide this gate');
  });
  it('an unknown project or gate is 404', async () => {
    const h = { 'cf-access-jwt-assertion': await sign({ email: 'mika@jitera.com' }) };
    expect((await get('/gate/P-ENG-12/gnope', h)).status).toBe(404);
    expect((await get(`/gate/P-ENG-99/${gate}`, h)).status).toBe(404);
  });
  it('escapes values on the page', async () => {
    server.close();
    await setup({ ...PROJECT, name: '<b>x</b>' });
    const html = await (await get(gatePath, { 'cf-access-jwt-assertion': await sign({ email: 'mika@jitera.com' }) })).text();
    expect(html).toContain('&lt;b&gt;x&lt;/b&gt;');
    expect(html).not.toContain('<b>x</b>');
  });
});

describe('confirm POST', () => {
  it('a POST without the right csrf or origin changes nothing', async () => {
    const jwt = await sign({ email: 'mika@jitera.com' });
    const csrf = csrfOf(gate, 'mika@jitera.com');
    const h = { ...FORM, 'cf-access-jwt-assertion': jwt };
    expect((await post(gatePath, form({ decision: 'approve', csrf }), h)).status).toBe(403); // no Origin
    expect((await post(gatePath, form({ decision: 'approve', csrf }), { ...h, origin: 'https://evil.example.com' })).status).toBe(403);
    expect((await post(gatePath, form({ decision: 'approve' }), { ...h, origin: ORIGIN })).status).toBe(403);
    expect((await post(gatePath, form({ decision: 'approve', csrf: csrfOf(gate, 'ken@jitera.com') }), { ...h, origin: ORIGIN })).status).toBe(403);
    expect((await post(gatePath, form({ decision: 'maybe', csrf }), { ...h, origin: ORIGIN })).status).toBe(403);
    const rawKey = createHmac('sha256', config.gateSecret).update(`csrf|${gate}|mika@jitera.com`).digest('hex');
    expect((await post(gatePath, form({ decision: 'approve', csrf: rawKey, to: 'flow:plan' }), { ...h, origin: ORIGIN })).status).toBe(403);
    expect((await post(gatePath, form({ decision: 'approve', csrf }), { ...FORM, origin: ORIGIN })).status).toBe(401);
    expect(tracker.labels).toEqual(['flow:spec-review']);
    expect(readGates((await docs.read(STATUS))!)[0]!.status).toBe('open');
  });
  it('the owner approves on the page', async () => {
    const h = { ...FORM, origin: ORIGIN, 'cf-access-jwt-assertion': await sign({ email: 'Mika@jitera.com' }) };
    const body = form({ decision: 'approve', csrf: csrfOf(gate, 'mika@jitera.com'), to: 'flow:plan' });
    const r = await post(gatePath, body, h);
    expect(r.status).toBe(303);
    expect(r.headers.get('location')).toBe(ORIGIN + gatePath);
    expect(tracker.labels).toEqual(['flow:plan']);
    expect(await docs.read(STATUS)).toContain('Spec review approved - mika@jitera.com via page');
    const again = await post(gatePath, body, h);
    expect(again.status).toBe(409);
    expect(await again.text()).toContain('closed');
  });
  it('a POST for another move than the gate is refused as mismatch', async () => {
    const h = { ...FORM, origin: ORIGIN, 'cf-access-jwt-assertion': await sign({ email: 'mika@jitera.com' }) };
    const r = await post(gatePath, form({ decision: 'approve', csrf: csrfOf(gate, 'mika@jitera.com'), to: 'flow:tdr' }), h);
    expect(r.status).toBe(409);
    expect(await r.text()).toContain('mismatch');
    expect(tracker.labels).toEqual(['flow:spec-review']);
  });
  it('the origin check normalizes case and the default port of publicUrl', async () => {
    server.close();
    await setup(PROJECT, { ...config, publicUrl: 'https://Flow.Example.COM:443' });
    const h = { ...FORM, origin: ORIGIN, 'cf-access-jwt-assertion': await sign({ email: 'mika@jitera.com' }) };
    const r = await post(gatePath, form({ decision: 'approve', csrf: csrfOf(gate, 'mika@jitera.com'), to: 'flow:plan' }), h);
    expect(r.status).toBe(303);
    expect(tracker.labels).toEqual(['flow:plan']);
  });
});

describe('gate webhook', () => {
  const now = () => Math.floor(Date.now() / 1000);
  const hook = (body: string, o: { secret?: string; ts?: number | string } = {}) => {
    const ts = String(o.ts ?? now());
    const sig = createHmac('sha256', o.secret ?? CALLBACK).update(`${ts}.${body}`).digest('hex');
    return post('/webhooks/gate', body, { 'content-type': 'application/json', 'x-jflow-timestamp': ts, 'x-jflow-signature': `sha256=${sig}` });
  };
  const bodyOf = (v: Record<string, string>) =>
    JSON.stringify({ gate, project: 'P-ENG-12', decision: 'approve', email: 'Mika@Jitera.com', source: 'chat', to: 'flow:plan', ...v });

  it('the gate webhook checks the signature and the clock', async () => {
    const body = bodyOf({});
    expect((await hook(body, { secret: 'wrong' })).status).toBe(401);
    expect((await hook(body, { ts: now() - 301 })).status).toBe(401);
    expect((await hook(body, { ts: now() + 301 })).status).toBe(401);
    expect((await hook(body, { ts: 'soon' })).status).toBe(401);
    expect(tracker.labels).toEqual(['flow:spec-review']);
    expect((await hook(body)).status).toBe(204);
    expect(tracker.labels).toEqual(['flow:plan']);
    expect(await docs.read(STATUS)).toContain('Spec review approved - mika@jitera.com via chat');
    const r = await hook(body);
    expect(r.status).toBe(409); // closed now
    expect(await r.json()).toEqual({ error: 'closed' });
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
