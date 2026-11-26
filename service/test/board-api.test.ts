import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { fileURLToPath } from 'node:url';
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from 'jose';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { mapLimit } from '../src/board/mapLimit.js';
import { memoryChatTokenStore } from '../src/chats/memoryChatTokenStore.js';
import { openChatTokens } from '../src/chats/openChatTokens.js';
import type { Config } from '../src/config/types.js';
import { memoryDocuments } from '../src/documents/memoryDocuments.js';
import type { Documents } from '../src/documents/types.js';
import type { Deps } from '../src/feature/types.js';
import { createHttpServer } from '../src/http/createHttpServer.js';
import { memorySettingsStore } from '../src/settings/memorySettingsStore.js';
import { openSettings } from '../src/settings/openSettings.js';
import type { LiveSettings, SettingsInput } from '../src/settings/types.js';

const TEAM = 'team.cloudflareaccess.com';
const AUD = 'aud-1';
const ORIGIN = 'https://flow.example.com';
const MIKA = 'mika@jitera.com';
const EVE = 'eve@jitera.com';
const WEB = fileURLToPath(new URL('./fixtures/web', import.meta.url));
const config = { flowFolder: 'documents/Flow', templatesDir: '', webDir: WEB, access: { teamDomain: TEAM, aud: AUD } } as Config;
const NOW = new Date('2026-11-26T12:00:00.000Z');
const AGENT = 'https://studio.jitera.app/p/core/chat?a=agent-1';

const STATUS = `# Status - P-ENG-12 Export

Linear: https://linear.app/x/project/export-s1

| # | Stage | Status | File | Updated | By |
| --- | --- | --- | --- | --- | --- |
| 1 | Intent | done | 1-intent.md | 2026-11-20 | mika@jitera.com |
| 2 | Spec | in progress | 2-spec.md | 2026-11-21 | Flow agent |
| 3 | Spec review | not started | - | | |

## Gates

| Gate | From | To | Roles | Opened | Status | Approved by | Decided by | Sig |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| g1 | flow:spec-review | flow:plan | owner, engineer | 2026-11-24T00:00:00.000Z | open | owner:mika@jitera.com | | s |

## Log

- 2026-11-20 - Intent - mika@jitera.com - folder created
- 2026-11-22 - Plan - Flow agent - plan drafted
`;
const FILES = {
  'documents/Flow/P-ENG-12 Export/0-status.md': STATUS,
  'documents/Flow/P-ENG-12 Export/1-intent.md': '# Intent',
  'documents/Flow/P-ENG-13 Orphan/0-status.md': STATUS.replace('export-s1', 'orphan-zz'),
  'documents/Flow/P-ENG-14 Nourl/0-status.md': '# Status\n',
};

type Node = Record<string, unknown>;
const node = (slugId: string, label: string | null, o: Node = {}): Node => ({
  id: `u-${slugId}`, slugId, name: `N ${slugId}`, url: `https://linear.app/x/project/n-${slugId}`,
  updatedAt: '2026-11-20T00:00:00.000Z', status: { type: 'started' }, lead: { name: 'Mika', email: MIKA },
  teams: { nodes: [{ key: 'ENG' }] }, labels: { nodes: label ? [{ name: label }] : [] }, ...o,
});
let nodes: Node[];
let linearCalls: Array<string[]>;
let linearFails: boolean;
const fakeLinear = (async (_url: unknown, init: { body: string }) => {
  const { variables } = JSON.parse(init.body);
  linearCalls.push(variables.teams);
  if (linearFails) return new Response(JSON.stringify({ errors: [{ message: 'bad key LIN-KEY-BBB' }] }), { status: 401 });
  const inTeams = nodes.filter((n) => (n.teams as { nodes: Array<{ key: string }> }).nodes.some((t) => variables.teams.includes(t.key)));
  const projects = { pageInfo: { hasNextPage: false, endCursor: null }, nodes: inTeams };
  return new Response(JSON.stringify({ data: { projects } }), { status: 200 });
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
let settings: LiveSettings;
let docs: Documents;
let deps: Deps;
let now: Date;
const GOOD: SettingsInput = {
  docsUrl: 'https://d.example.com', docsToken: 'DOCS-TOKEN-AAA', linearApiKey: 'LIN-KEY-BBB',
  teams: ['ENG', 'CORE'], engineers: [MIKA],
};

async function start(input: Partial<SettingsInput> = {}) {
  settings = await openSettings(memorySettingsStore(), 'k'.repeat(32), { engineers: [MIKA], publicUrl: ORIGIN }, () => NOW);
  await settings.save({ ...GOOD, ...input }, MIKA);
  const chats = await openChatTokens(memoryChatTokenStore(), 'k'.repeat(32), [], () => NOW);
  docs = memoryDocuments(FILES);
  deps = { config, settings, chats, docs, tracker: {} as never, now: () => now };
  server = createHttpServer(deps, { jwks, fetch: fakeLinear });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}
const restart = async (input: Partial<SettingsInput>) => {
  await new Promise<void>((r) => server.close(() => r()));
  await start(input);
};
beforeEach(async () => {
  now = NOW;
  linearCalls = [];
  linearFails = false;
  nodes = [
    node('s1', 'flow:plan'),
    node('s2', 'flow:intent', { teams: { nodes: [{ key: 'CORE' }] }, lead: { name: 'Bo', email: 'bo@jitera.com' } }),
    node('s3', null),
  ];
  await start();
});
afterEach(() => new Promise<void>((r) => server.close(() => r())));

const get = async (path: string, email: string | null = MIKA) =>
  fetch(base + path, { headers: email ? { 'cf-access-jwt-assertion': await sign(email) } : {}, redirect: 'manual' });
const cards = (b: { columns: Array<{ cards: Array<Record<string, unknown>> }> }) => b.columns.flatMap((c) => c.cards);

describe('access', () => {
  it.each(['/api/me', '/api/board', '/api/board/feature/P-ENG-12'])('%s: 401 without Access', async (path) => {
    expect((await get(path, null)).status).toBe(401);
  });
  it('a non-engineer opens the board and the panel, but not settings', async () => {
    expect((await get('/api/board', EVE)).status).toBe(200);
    expect((await get('/api/board/feature/P-ENG-12', EVE)).status).toBe(200);
    expect((await get('/api/settings', EVE)).status).toBe(403);
  });
  it('/api/me says who you are, whether you are an engineer, and the picked teams', async () => {
    expect(await (await get('/api/me')).json()).toEqual({ email: MIKA, engineer: true, teams: ['ENG', 'CORE'], flowAgentUrl: '' });
    expect(await (await get('/api/me', EVE)).json()).toEqual({ email: EVE, engineer: false, teams: ['ENG', 'CORE'], flowAgentUrl: '' });
  });
  it('/api/me carries the Flow agent link to every Access user', async () => {
    await restart({ flowAgentUrl: AGENT });
    expect((await (await get('/api/me', EVE)).json()).flowAgentUrl).toBe(AGENT);
  });
  it('board routes are GET only', async () => {
    const r = await fetch(base + '/api/board', { method: 'POST', headers: { 'cf-access-jwt-assertion': await sign(MIKA), origin: ORIGIN } });
    expect(r.status).toBe(404);
  });
});

describe('/api/board', () => {
  it('joins folders to Linear by the URL in 0-status.md', async () => {
    const b = await (await get('/api/board', EVE)).json();
    expect(b.notice).toBeNull();
    const all = cards(b);
    expect(all.map((c) => c.slugId)).toEqual(['s2', 's1']);
    expect(all[1]).toMatchObject({ key: 'P-ENG-12', id: 'P-ENG-12', stage: 'Plan', notStarted: false, behind: true, days: 6 });
    expect(all[0]).toMatchObject({ key: 's2', id: null, stage: 'Intent', notStarted: true, days: 6 });
    expect(b.columns.map((c: { stage: string }) => c.stage)[0]).toBe('Intent');
  });
  it('filters by team; a team not picked is ignored', async () => {
    const b = await (await get('/api/board?team=CORE,NOPE')).json();
    expect(linearCalls.at(-1)).toEqual(['CORE']);
    expect(cards(b).map((c) => c.slugId)).toEqual(['s2']);
  });
  it('older=1 adds Done cards older than 14 days from the same cached load', async () => {
    nodes.push(node('s9', 'flow:done', { updatedAt: '2026-10-01T00:00:00.000Z' }));
    expect(cards(await (await get('/api/board')).json()).map((c) => c.slugId)).not.toContain('s9');
    expect(cards(await (await get('/api/board?older=1')).json()).map((c) => c.slugId)).toContain('s9');
    expect(linearCalls).toHaveLength(1);
  });
  it('mine keeps only the cards waiting for me', async () => {
    const b = await (await get('/api/board?mine=1')).json();
    expect(cards(b).map((c) => c.slugId)).toEqual(['s1']);
  });
  it('caches 60 seconds per team set; refresh=1 skips the cache', async () => {
    const first = await (await get('/api/board')).json();
    nodes = [];
    const second = await (await get('/api/board', EVE)).json();
    expect(second).toEqual({ ...first, columns: expect.any(Array) });
    expect(cards(second)).toHaveLength(2);
    expect(linearCalls).toHaveLength(1);
    await get('/api/board?team=ENG');
    expect(linearCalls).toHaveLength(2);
    const fresh = await (await get('/api/board?refresh=1')).json();
    expect(linearCalls).toHaveLength(3);
    expect(cards(fresh)).toEqual([]);
    now = new Date(NOW.getTime() + 61_000);
    await get('/api/board?team=ENG');
    expect(linearCalls).toHaveLength(4);
  });
  it('a failing Jitera list still returns every card from Linear, with the notice', async () => {
    docs.list = async () => { throw new Error('down DOCS-TOKEN-AAA'); };
    const r = await get('/api/board');
    expect(r.status).toBe(200);
    const b = await r.json();
    expect(b.notice).toMatch(/could not read the status files/);
    expect(cards(b).map((c) => [c.slugId, c.stage, c.notStarted])).toEqual([['s2', 'Intent', true], ['s1', 'Plan', true]]);
  });
  it('a failing single read makes that file null', async () => {
    const read = docs.read;
    docs.read = async (p) => { if (p.includes('P-ENG-12')) throw new Error('x'); return read(p); };
    const b = await (await get('/api/board')).json();
    expect(b.notice).toBeNull();
    expect(cards(b).find((c) => c.slugId === 's1')).toMatchObject({ notStarted: true, id: null, key: 's1' });
  });
  it('a failing Linear is a 502 that leaks no key', async () => {
    linearFails = true;
    const r = await get('/api/board');
    expect(r.status).toBe(502);
    expect(await r.text()).not.toMatch(/LIN-KEY/);
  });
  it('409 not_configured without the Linear key or the Jitera token', async () => {
    for (const missing of [{ linearApiKey: '' }, { docsToken: '' }]) {
      await restart(missing);
      for (const path of ['/api/board', '/api/board/feature/P-ENG-12']) {
        const r = await get(path);
        expect(r.status).toBe(409);
        expect((await r.json()).error).toBe('not_configured');
      }
    }
  });
});

it('mapLimit keeps order and runs at most the limit at once', async () => {
  let running = 0;
  let most = 0;
  const out = await mapLimit([...Array(20).keys()], 8, async (i) => {
    most = Math.max(most, ++running);
    await new Promise((r) => setTimeout(r, 1));
    running--;
    return i * 2;
  });
  expect(most).toBe(8);
  expect(out).toEqual([...Array(20).keys()].map((i) => i * 2));
});

describe('/api/board/feature', () => {
  it('shows the panel by project ID', async () => {
    const r = await get('/api/board/feature/P-ENG-12', EVE);
    const text = await r.text();
    expect(text).not.toMatch(/LIN-KEY|DOCS-TOKEN/);
    const p = JSON.parse(text);
    expect(p.card).toMatchObject({ key: 'P-ENG-12', slugId: 's1', stage: 'Plan' });
    expect(p.behind).toBe(true);
    expect(p.stages).toEqual([
      { stage: 'Intent', status: 'done', date: '2026-11-20' },
      { stage: 'Spec', status: 'in progress', date: '2026-11-21' },
      { stage: 'Spec review', status: 'not started', date: '' },
    ]);
    expect(p.log).toHaveLength(2);
    expect(p.gate).toEqual({ url: `${ORIGIN}/gate/P-ENG-12/g1`, from: 'Spec review', to: 'Plan', missing: ['engineer'] });
    expect(p.files).toEqual(['0-status.md', '1-intent.md']);
    expect(p.linearUrl).toBe('https://linear.app/x/project/n-s1');
    expect(p.folder).toBe('documents/Flow/P-ENG-12 Export/');
    expect(p.notice).toBeNull();
  });
  it('opens the panel of a flow:verify project, waiting for the owner', async () => {
    nodes.push(node('s7', 'flow:verify'));
    const r = await get('/api/board/feature/s7');
    expect(r.status).toBe(200);
    expect((await r.json()).card).toMatchObject({ stage: 'Verify', waitsFor: [{ kind: 'owner', names: ['Mika'] }] });
    expect(cards(await (await get('/api/board')).json()).find((c) => c.slugId === 's7')).toMatchObject({ stage: 'Verify' });
  });
  it('a failing Jitera gives the Linear card with a notice', async () => {
    nodes[0] = node('s1', 'flow:plan', { name: 'Export' }); // the slugId finds the folder by name, so read runs too
    for (const broken of ['list', 'read'] as const) {
      await restart({});
      docs[broken] = async () => { throw new Error('down DOCS-TOKEN-AAA'); };
      const r = await get('/api/board/feature/s1');
      expect(r.status).toBe(200);
      const text = await r.text();
      expect(text).not.toMatch(/DOCS-TOKEN/);
      expect(JSON.parse(text)).toMatchObject({
        card: { key: 's1', stage: 'Plan', notStarted: true }, stages: [], log: [], gate: null, files: [], folder: null,
        notice: 'jflow could not read the status file in Jitera.',
      });
    }
    const byId = await get('/api/board/feature/P-ENG-12');
    expect(byId.status).toBe(502);
    expect(await byId.text()).not.toMatch(/DOCS-TOKEN/);
  });
  it('shows a not started project by slugId', async () => {
    const p = await (await get('/api/board/feature/s2')).json();
    expect(p).toMatchObject({ card: { key: 's2', notStarted: true }, stages: [], log: [], gate: null, files: [], behind: false, folder: null, notice: null });
  });
  it('reads fresh', async () => {
    await get('/api/board/feature/P-ENG-12');
    await get('/api/board/feature/P-ENG-12');
    expect(linearCalls).toHaveLength(2);
  });
  it('404 for an unknown project, one with no flow label, or a folder no project matches', async () => {
    for (const key of ['P-ENG-99', 's3', 'nope', 'P-ENG-13', 'P-ENG-14']) {
      expect((await get(`/api/board/feature/${key}`)).status).toBe(404);
    }
  });
  it('404 for a project outside the picked teams', async () => {
    await restart({ teams: ['CORE'] });
    expect((await get('/api/board/feature/P-ENG-12')).status).toBe(404);
  });
});

describe('pages', () => {
  it('/ serves the app when configured; /workload and /f/<ID> too', async () => {
    for (const path of ['/', '/workload', '/f/P-ENG-12']) {
      const r = await get(path, null);
      expect(r.status).toBe(200);
      expect(await r.text()).toContain('jflow fixture');
    }
  });
  it('/ redirects to /settings while not configured', async () => {
    for (const missing of [{ linearApiKey: '' }, { docsToken: '' }, { docsUrl: '' }]) {
      await restart(missing);
      const r = await get('/', null);
      expect(r.status).toBe(302);
      expect(r.headers.get('location')).toBe('/settings');
    }
  });
});
