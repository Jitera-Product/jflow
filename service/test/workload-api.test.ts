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
import type { Deps } from '../src/feature/types.js';
import { createHttpServer } from '../src/http/createHttpServer.js';
import { memorySettingsStore } from '../src/settings/memorySettingsStore.js';
import { openSettings } from '../src/settings/openSettings.js';
import type { SettingsInput } from '../src/settings/types.js';

const TEAM = 'team.cloudflareaccess.com';
const AUD = 'aud-1';
const ORIGIN = 'https://flow.example.com';
const MIKA = 'mika@jitera.com';
const EVE = 'eve@jitera.com';
const WEB = fileURLToPath(new URL('./fixtures/web', import.meta.url));
const config = { flowFolder: 'documents/Flow', templatesDir: '', webDir: WEB, access: { teamDomain: TEAM, aud: AUD } } as Config;
const NOW = new Date('2026-11-26T12:00:00.000Z');
const GOOD: SettingsInput = {
  docsUrl: 'https://d.example.com', docsToken: 'DOCS-TOKEN-AAA', linearApiKey: 'LIN-KEY-BBB',
  teams: ['ENG'], engineers: [MIKA],
};

const ann = { id: 'u1', name: 'Ann', displayName: null, email: 'ann@x.com' };
const page = (nodes: unknown[]) => ({ nodes, pageInfo: { hasNextPage: false, endCursor: null } });
const issueNode = (identifier: string, o: Record<string, unknown> = {}) => ({
  identifier, title: 't', url: `https://l/${identifier}`, updatedAt: '2026-11-25T12:00:00.000Z', completedAt: null,
  state: { name: 'In Progress' }, assignee: ann, project: null, labels: { nodes: [] }, ...o,
});

type Call = { name: string; variables: Record<string, any> };
let calls: Call[];
let linearFails: boolean;
const fakeLinear = (async (_url: unknown, init: { body: string }) => {
  const { query, variables } = JSON.parse(init.body);
  const name = /query (\w+)/.exec(query)![1];
  calls.push({ name, variables });
  if (linearFails) return new Response(JSON.stringify({ errors: [{ message: 'bad key LIN-KEY-BBB' }] }), { status: 401 });
  const data =
    name === 'BoardOptions' ? {
      teams: page([{ id: 't2', name: 'Zed', key: 'ZED' }, { id: 't1', name: 'Alpha', key: 'ALP' }]),
      projectStatuses: page([{ id: 's2', name: 'Done', type: 'completed', position: 2 }, { id: 's1', name: 'Active', type: 'started', position: 1 }]),
    }
    : name === 'BoardProjects' ? { projects: page([{ id: 'p1', name: 'Alpha', url: 'https://l/p1', status: { name: 'In Progress', type: 'started' }, lead: ann, members: { nodes: [] } }]) }
    : { issues: page(variables.filter.state?.type?.eq === 'started' ? [issueNode('ENG-1', { project: { id: 'p1', name: 'Alpha' } }), issueNode('ENG-2')] : []) };
  return new Response(JSON.stringify({ data }), { status: 200 });
}) as unknown as typeof fetch;

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
let now: Date;
async function start(input: Partial<SettingsInput> = {}) {
  const settings = await openSettings(memorySettingsStore(), 'k'.repeat(32), { engineers: [MIKA] }, () => NOW);
  await settings.save({ ...GOOD, ...input }, MIKA);
  const chats = await openChatTokens(memoryChatTokenStore(), 'k'.repeat(32), [], () => NOW);
  const deps: Deps = { config, settings, chats, featureChats: memoryFeatureChatStore(), docs: memoryDocuments({}), tracker: {} as never, now: () => now };
  server = createHttpServer(deps, { jwks, fetch: fakeLinear });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}
beforeEach(async () => {
  now = NOW;
  calls = [];
  linearFails = false;
  await start();
});
afterEach(() => new Promise<void>((r) => server.close(() => r())));

const get = async (path: string, email: string | null = EVE) =>
  fetch(base + path, { headers: email ? { 'cf-access-jwt-assertion': await sign(email) } : {} });
const boardCalls = () => calls.filter((c) => c.name === 'BoardProjects');

describe('/api/workload', () => {
  it('401 without Access; a non-engineer is let in', async () => {
    expect((await get('/api/workload', null)).status).toBe(401);
    expect((await get('/api/workload/options', null)).status).toBe(401);
    expect((await get('/api/workload')).status).toBe(200);
  });
  it('returns the Worker shape for a stubbed Linear', async () => {
    const b = await (await get('/api/workload')).json();
    expect(b.window).toBe('-P30D');
    expect(typeof b.updatedAt).toBe('string');
    expect(b.summary).toMatchObject({ people: 1, active: 2, offBoard: 1, noProject: 1 });
    expect(b.people[0].person).toEqual({ id: 'u1', name: 'Ann' });
    expect(b.settings).toEqual({ paceDays: 21, minClosures: 3, stuckHours: 24 });
  });
  it('passes team, status and window to Linear', async () => {
    await get('/api/workload?team=b,a&status=s1&window=-P90D');
    const f = boardCalls()[0].variables.filter;
    expect(f.status).toEqual({ id: { in: ['s1'] } });
    expect(f.accessibleTeams).toEqual({ some: { id: { in: ['a', 'b'] } } });
    expect(calls.find((c) => c.variables.filter?.state?.type?.eq === 'started')!.variables.filter.updatedAt).toEqual({ gt: '-P90D' });
  });
  it.each([
    '/api/workload?window=-P7D',
    '/api/workload?team=bad%20id',
    '/api/workload?status=a;b',
    `/api/workload?team=${Array.from({ length: 51 }, (_, i) => `t${i}`).join(',')}`,
  ])('400 for %s', async (path) => {
    const r = await get(path);
    expect(r.status).toBe(400);
    expect(calls).toEqual([]);
  });
  it('caches 10 minutes per query; refresh=1 skips the cache', async () => {
    await get('/api/workload');
    await get('/api/workload');
    expect(boardCalls()).toHaveLength(1);
    await get('/api/workload?window=-P14D');
    expect(boardCalls()).toHaveLength(2);
    await get('/api/workload?refresh=1');
    expect(boardCalls()).toHaveLength(3);
    now = new Date(NOW.getTime() + 9 * 60_000);
    await get('/api/workload');
    expect(boardCalls()).toHaveLength(3);
    now = new Date(NOW.getTime() + 11 * 60_000);
    await get('/api/workload');
    expect(boardCalls()).toHaveLength(4);
  });
  it('a failing Linear is a 502 that leaks no key', async () => {
    linearFails = true;
    const r = await get('/api/workload');
    expect(r.status).toBe(502);
    expect(await r.text()).not.toMatch(/LIN-KEY/);
  });
  it('409 not_configured without the Linear key', async () => {
    await new Promise<void>((r) => server.close(() => r()));
    await start({ linearApiKey: '' });
    for (const p of ['/api/workload', '/api/workload/options']) {
      const r = await get(p);
      expect(r.status).toBe(409);
      expect((await r.json()).error).toBe('not_configured');
    }
  });
  it('is GET only', async () => {
    const r = await fetch(base + '/api/workload', { method: 'POST', headers: { 'cf-access-jwt-assertion': await sign(MIKA), origin: ORIGIN } });
    expect(r.status).toBe(404);
  });
});

describe('/api/workload/options', () => {
  it('sorts teams by name and statuses by position', async () => {
    const o = await (await get('/api/workload/options')).json();
    expect(o.teams.map((t: { key: string }) => t.key)).toEqual(['ALP', 'ZED']);
    expect(o.statuses).toEqual([{ id: 's1', name: 'Active', type: 'started' }, { id: 's2', name: 'Done', type: 'completed' }]);
  });
  it('is cached and a failing Linear is 502', async () => {
    await get('/api/workload/options');
    await get('/api/workload/options');
    expect(calls.filter((c) => c.name === 'BoardOptions')).toHaveLength(1);
    await new Promise<void>((r) => server.close(() => r()));
    await start();
    linearFails = true;
    const r = await get('/api/workload/options');
    expect(r.status).toBe(502);
    expect(await r.text()).not.toMatch(/LIN-KEY/);
  });
});
