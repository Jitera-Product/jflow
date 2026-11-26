import { DEFAULT_VERBS } from '../src/config/defaultVerbs.js';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { fileURLToPath } from 'node:url';
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from 'jose';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { memoryChatTokenStore } from '../src/chats/memoryChatTokenStore.js';
import { openChatTokens } from '../src/chats/openChatTokens.js';
import { memoryFeatureChatStore } from '../src/featureChats/memoryFeatureChatStore.js';
import type { Config } from '../src/config/types.js';
import { memoryDocuments } from '../src/documents/memoryDocuments.js';
import type { Documents } from '../src/documents/types.js';
import type { Deps } from '../src/feature/types.js';
import { createHttpServer } from '../src/http/createHttpServer.js';
import { memorySettingsStore } from '../src/settings/memorySettingsStore.js';
import { openSettings } from '../src/settings/openSettings.js';
import type { LiveSettings } from '../src/settings/types.js';
import { flowLabels } from '../src/linear/flowLabels.js';

const TEAM = 'team.cloudflareaccess.com';
const AUD = 'aud-1';
const ORIGIN = 'https://flow.example.com';
const MIKA = 'mika@jitera.com';
const config = {
  flowFolder: 'documents/Flow', templatesDir: '', webDir: '', access: { teamDomain: TEAM, aud: AUD },
  agentFile: fileURLToPath(new URL('../agent/flow-agent.md', import.meta.url)),
  documents: { kind: 'jitera', verbs: DEFAULT_VERBS },
} as Config;

let sign: (email: string) => Promise<string>;
let jwks: ReturnType<typeof createLocalJWKSet>;
beforeAll(async () => {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  jwks = createLocalJWKSet({ keys: [{ ...(await exportJWK(publicKey)), kid: 'k1', alg: 'RS256' }] });
  sign = (email) => new SignJWT({ email }).setProtectedHeader({ alg: 'RS256', kid: 'k1' })
    .setIssuer(`https://${TEAM}`).setAudience(AUD).setIssuedAt().setExpirationTime('5m').sign(privateKey);
});

let server: Server;
let base: string;
let settings: LiveSettings;
let deps: Deps;
let linearCalls: string[];
let linearFails: boolean;
const have = ['flow:intent'];

const fakeLinear = (async (_url: any, init: any) => {
  const { query, variables } = JSON.parse(init.body);
  const op = /(?:query|mutation)\s+(\w+)/.exec(query)![1]!;
  linearCalls.push(op === 'CreateFlowLabel' ? `create:${variables.name}` : op);
  if (linearFails) return new Response(JSON.stringify({ errors: [{ message: 'bad key LIN-KEY-BBB' }] }), { status: 401 });
  const data: Record<string, unknown> = {
    FlowViewer: { viewer: { id: 'u' } },
    FlowTeams: { teams: { nodes: [{ key: 'ENG', name: 'Engineering' }] } },
    FlowProjectLabels: { projectLabels: { nodes: have.map((name) => ({ name })) } },
    CreateFlowLabel: { projectLabelCreate: { success: true, projectLabel: { id: 'new' } } },
  };
  if (op === 'CreateFlowLabel') have.push(variables.name);
  return new Response(JSON.stringify({ data: data[op] }), { status: 200 });
}) as typeof fetch;

let made: Array<{ url: string; token: string }>;
let docsFail: string | null;
const makeDocs = ((conn: { url: string; token: string }) => {
  made.push({ url: conn.url, token: conn.token });
  return { list: async () => { if (docsFail) throw new Error(docsFail); return []; } };
}) as never;

async function start(publicUrl = ORIGIN, linearApiKey = 'LIN-KEY-BBB', docs?: Documents) {
  settings = await openSettings(memorySettingsStore(), 'k'.repeat(32), { engineers: [MIKA], publicUrl }, () => new Date());
  await settings.save({ docsUrl: 'https://d.example.com', docsToken: 'DOCS-STORED', teams: ['ENG'], engineers: [MIKA], linearApiKey }, MIKA);
  const chats = await openChatTokens(memoryChatTokenStore(), 'k'.repeat(32), [], () => new Date());
  deps = { config, settings, chats, featureChats: memoryFeatureChatStore(), docs: docs ?? memoryDocuments({}), tracker: {} as never, now: () => new Date() };
  server = createHttpServer(deps, { jwks, fetch: fakeLinear, makeDocs });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}
beforeEach(async () => {
  linearCalls = [];
  linearFails = false;
  made = [];
  docsFail = null;
  have.splice(0, have.length, 'flow:intent');
  await start();
});
afterEach(() => new Promise<void>((r) => server.close(() => r())));

const call = async (method: string, path: string, email: string | null = MIKA, body?: unknown, extra: Record<string, string> = {}) =>
  fetch(base + path, {
    method,
    headers: {
      ...(email ? { 'cf-access-jwt-assertion': await sign(email) } : {}),
      ...(method !== 'GET' ? { origin: ORIGIN } : {}),
      ...(body ? { 'content-type': 'application/json' } : {}),
      ...extra,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

describe('access', () => {
  const routes: Array<[string, string, unknown?]> = [
    ['GET', '/api/setup'], ['GET', '/api/linear/teams'], ['GET', '/api/linear/labels'],
    ['GET', '/api/chats'], ['POST', '/api/chats', { name: 'x' }], ['DELETE', '/api/chats/abc'], ['GET', '/api/agent-prompt'], ['POST', '/api/setup/jitera', { docsUrl: 'https://d.example.com' }],
  ];
  it.each(routes)('%s %s: 401 without Access, 403 for a non-engineer', async (method, path, body) => {
    expect((await call(method, path, null, body)).status).toBe(401);
    const r = await call(method, path, 'eve@jitera.com', body);
    expect(r.status).toBe(403);
    expect((await r.json()).error).toBe('not_allowed');
  });
  it('POST and DELETE refuse a foreign origin', async () => {
    expect((await call('POST', '/api/chats', MIKA, { name: 'x' }, { origin: 'https://evil.example.com' })).status).toBe(403);
    expect((await call('DELETE', '/api/chats/abc', MIKA, undefined, { origin: 'https://evil.example.com' })).status).toBe(403);
  });
  it('wrong methods are 404', async () => {
    expect((await call('DELETE', '/api/chats')).status).toBe(404);
    expect((await call('POST', '/api/setup')).status).toBe(404);
  });
});

describe('/api/setup', () => {
  const setup = async () => (await call('GET', '/api/setup')).json();

  it('reports each step', async () => {
    expect(await setup()).toEqual({ linear: { ok: true }, jitera: { ok: true }, chats: { ok: false } });
    const { token } = await deps.chats.create('agent', MIKA);
    deps.chats.used(deps.chats.find(token)!.id);
    expect((await setup()).chats).toEqual({ ok: true });
  });
  it('Linear without a key, or without a team, is not ok', async () => {
    await server.close();
    await start(ORIGIN, '');
    expect((await setup()).linear).toEqual({ ok: false, message: 'Add a Linear API key.' });
    await settings.save({ docsUrl: 'https://d.example.com', teams: [], engineers: [MIKA], linearApiKey: 'LIN-KEY-BBB' }, MIKA);
    expect((await setup()).linear).toEqual({ ok: false, message: 'Pick at least one Linear team.' });
  });
  it('a failing Linear or Jitera is reported, never thrown, and leaks no secret', async () => {
    linearFails = true;
    deps.docs.list = async () => { throw new Error('boom DOCS-STORED'); };
    const r = await call('GET', '/api/setup');
    expect(r.status).toBe(200);
    const text = await r.text();
    expect(JSON.parse(text)).toMatchObject({ linear: { ok: false }, jitera: { ok: false } });
    expect(text).not.toMatch(/LIN-KEY|DOCS-STORED/);
  });
});

describe('/api/linear', () => {
  it('teams', async () => {
    expect(await (await call('GET', '/api/linear/teams')).json()).toEqual({ teams: [{ key: 'ENG', name: 'Engineering' }] });
  });
  it('teams and labels are 409 no_key without a key', async () => {
    await server.close();
    await start(ORIGIN, '');
    for (const path of ['/api/linear/teams', '/api/linear/labels']) {
      const r = await call('GET', path);
      expect(r.status).toBe(409);
      expect((await r.json()).error).toBe('no_key');
    }
  });
  it('labels: GET lists the missing ones and creates nothing', async () => {
    expect((await (await call('GET', '/api/linear/labels')).json()).missing).toEqual(flowLabels().slice(1));
    expect(linearCalls.filter((c) => c.startsWith('create:'))).toEqual([]);
    expect((await call('POST', '/api/linear/labels')).status).toBe(404);
  });
  it('saving settings creates the missing flow labels', async () => {
    const r = await call('POST', '/api/settings', MIKA, { docsUrl: 'https://docs.example.com', teams: ['ENG'], engineers: [MIKA] });
    expect(r.status).toBe(200);
    expect(linearCalls.filter((c) => c.startsWith('create:'))).toEqual(flowLabels().slice(1).map((l) => 'create:' + l));
  });
  it('a save still succeeds when Linear cannot create the labels', async () => {
    linearFails = true;
    const r = await call('POST', '/api/settings', MIKA, { docsUrl: 'https://docs.example.com', teams: ['ENG'], engineers: [MIKA] });
    expect(r.status).toBe(200);
  });
  it('a Linear failure is a 502 with a message', async () => {
    linearFails = true;
    const r = await call('GET', '/api/linear/teams');
    expect(r.status).toBe(502);
    const text = await r.text();
    expect(text).toContain('Linear did not answer. Check the key and try again.');
    expect(text).not.toMatch(/LIN-KEY/);
  });
});

describe('/api/chats', () => {
  it('creates, lists and revokes', async () => {
    const r = await call('POST', '/api/chats', MIKA, { name: 'claude' });
    expect(r.status).toBe(200);
    const { chat, token } = await r.json();
    expect(chat).toMatchObject({ name: 'claude', createdBy: MIKA, lastUsedAt: null });
    expect(typeof token).toBe('string');
    const list = await (await call('GET', '/api/chats')).json();
    expect(list.chats).toHaveLength(1);
    expect(JSON.stringify(list)).not.toContain(token);
    expect((await call('DELETE', `/api/chats/${chat.id}`)).status).toBe(204);
    expect((await call('DELETE', `/api/chats/${chat.id}`)).status).toBe(404);
    expect((await (await call('GET', '/api/chats')).json()).chats).toEqual([]);
  });
  it('409 name_taken, 400 without a name', async () => {
    await call('POST', '/api/chats', MIKA, { name: 'claude' });
    const r = await call('POST', '/api/chats', MIKA, { name: 'claude' });
    expect(r.status).toBe(409);
    expect((await r.json()).error).toBe('name_taken');
    expect((await call('POST', '/api/chats', MIKA, { name: ' ' })).status).toBe(400);
  });
  it('400 for a name with | or a line break, and nothing is created', async () => {
    for (const name of ['Jitera | Flow', 'a\nb']) {
      const r = await call('POST', '/api/chats', MIKA, { name });
      expect(r.status).toBe(400);
      expect((await r.json()).problems).toEqual(['name: no | or line breaks']);
    }
    expect(deps.chats.list()).toEqual([]);
  });
  it('DELETE with an id that is not a uuid is 404', async () => {
    expect((await call('DELETE', '/api/chats/not-a-uuid')).status).toBe(404);
  });
  it('409 no_public_url while the public URL is empty', async () => {
    await server.close();
    await start('');
    const r = await fetch(base + '/api/chats', {
      method: 'POST', headers: { 'cf-access-jwt-assertion': await sign(MIKA), origin: 'https://first.example.com', 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'claude' }),
    });
    expect(r.status).toBe(409);
    expect((await r.json()).error).toBe('no_public_url');
    expect(deps.chats.list()).toEqual([]);
  });
});

describe('/api/agent-prompt', () => {
  it('serves the agent file as markdown', async () => {
    const r = await call('GET', '/api/agent-prompt');
    expect(r.status).toBe(200);
    expect(r.headers.get('content-type')).toContain('text/markdown');
    expect((await r.text()).length).toBeGreaterThan(100);
  });
});

describe('POST /api/setup/jitera', () => {
  const test = async (b: unknown) => (await call('POST', '/api/setup/jitera', MIKA, b)).json();
  it('tests the URL and token from the form, without saving them', async () => {
    expect(await test({ docsUrl: 'https://new.example.com/mcp', docsToken: 'NEW-TOKEN' })).toEqual({ ok: true });
    expect(made).toEqual([{ url: 'https://new.example.com/mcp', token: 'NEW-TOKEN' }]);
    expect(settings.get().docsUrl).toBe('https://d.example.com');
    expect(settings.get().docsToken).toBe('DOCS-STORED');
  });
  it('a blank token uses the stored one, but only for the stored URL', async () => {
    expect(await test({ docsUrl: 'https://d.example.com' })).toEqual({ ok: true });
    expect(made).toEqual([{ url: 'https://d.example.com', token: 'DOCS-STORED' }]);
    expect(await test({ docsUrl: 'https://other.example.com/mcp', docsToken: '' })).toEqual({ ok: false, message: 'Enter the Jitera token.' });
    expect(made).toHaveLength(1);
  });
  it('says why Jitera refused, without the token', async () => {
    docsFail = 'Error POSTing to endpoint (HTTP 403): Unauthorized for NEW-TOKEN';
    const r = await test({ docsUrl: 'https://new.example.com/mcp', docsToken: 'NEW-TOKEN' });
    expect(r).toEqual({ ok: false, message: 'Could not read the Jitera documents: Error POSTing to endpoint (HTTP 403): Unauthorized for ***' });
  });
  it('refuses a URL that is not https', async () => {
    expect(await test({ docsUrl: 'ftp://x', docsToken: 't' })).toEqual({ ok: false, message: 'The Jitera MCP URL must be an https URL.' });
    expect(made).toEqual([]);
  });
});
