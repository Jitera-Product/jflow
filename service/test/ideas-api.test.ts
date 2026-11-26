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
import { createHttpServer } from '../src/http/createHttpServer.js';
import { memorySettingsStore } from '../src/settings/memorySettingsStore.js';
import { openSettings } from '../src/settings/openSettings.js';

const TEAM = 'team.cloudflareaccess.com';
const AUD = 'aud-1';
const ORIGIN = 'https://flow.example.com';
const MIKA = 'mika@jitera.com';
const EVE = 'eve@jitera.com';
const WEB = fileURLToPath(new URL('./fixtures/web', import.meta.url));
const config = { flowFolder: 'documents/Flow', templatesDir: '', webDir: WEB, access: { teamDomain: TEAM, aud: AUD } } as Config;
const NOW = new Date('2026-11-26T12:00:00.000Z');

type Body = { query: string; variables: any };
let bodies: Body[];
let linearFails: boolean;
let userLookupFails: boolean;
let createFails: boolean;
const ANN = 'ann@jitera.com';
const fakeLinear = (async (_url: unknown, init: { body: string }) => {
  const body = JSON.parse(init.body) as Body;
  bodies.push(body);
  if (linearFails) return new Response(JSON.stringify({ errors: [{ message: 'bad key LIN-KEY-BBB' }] }), { status: 401 });
  const op = /(?:query|mutation)\s+(\w+)/.exec(body.query)![1];
  if (userLookupFails && body.query.includes('BoardUserByEmail')) return new Response('{}', { status: 500 });
  if (createFails && op === 'BoardProjectCreate') return new Response(JSON.stringify({ errors: [{ message: 'lead invalid' }] }), { status: 200 });
  const users: Record<string, object> = { [MIKA]: { id: 'u-mika', name: 'Mika', email: MIKA, active: true }, [ANN]: { id: 'u-ann', name: 'Ann', email: ANN, active: true } };
  const data = {
    BoardTeamMembers: { teams: { nodes: [{ members: { nodes: [
      { id: 'u-mika', name: 'Mika', email: 'Mika@Jitera.com', active: true },
      { id: 'u-bo', name: 'Bo', email: 'bo@jitera.com', active: true },
    ] } }] } },
    BoardUserByEmail: { users: { nodes: users[body.variables.email] ? [users[body.variables.email]] : [] } },
    BoardCreateLookup: { teams: { nodes: [{ id: 't-core' }] }, projectLabels: { nodes: [{ id: 'l-intent', name: 'flow:intent' }] } },
    BoardProjectCreate: { projectCreate: { success: true, project: { id: 'u-new', slugId: 'new-1', url: 'https://linear.app/x/project/new-1' } } },
  }[op as string];
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
async function start(publicUrl: string) {
  const settings = await openSettings(memorySettingsStore(), 'k'.repeat(32), { engineers: [MIKA], publicUrl }, () => NOW);
  await settings.save({ docsUrl: 'https://d.example.com', docsToken: 'DOCS-TOKEN-AAA', linearApiKey: 'LIN-KEY-BBB', teams: ['ENG', 'CORE'], engineers: [MIKA] }, MIKA);
  const chats = await openChatTokens(memoryChatTokenStore(), 'k'.repeat(32), [], () => NOW);
  const deps = { config, settings, chats, featureChats: memoryFeatureChatStore(), docs: memoryDocuments({}), tracker: {} as never, now: () => NOW };
  server = createHttpServer(deps, { jwks, fetch: fakeLinear });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}
beforeEach(async () => {
  bodies = [];
  linearFails = false;
  userLookupFails = false;
  createFails = false;
  await start(ORIGIN);
});
afterEach(() => new Promise<void>((r) => server.close(() => r())));

const get = async (path: string, email: string | null = MIKA) =>
  fetch(base + path, { headers: email ? { 'cf-access-jwt-assertion': await sign(email) } : {} });
const post = async (body: unknown, o: { email?: string | null; origin?: string } = {}) => {
  const email = o.email === undefined ? EVE : o.email;
  return fetch(base + '/api/ideas', {
    method: 'POST',
    headers: { 'content-type': 'application/json', origin: o.origin ?? ORIGIN, ...(email ? { 'cf-access-jwt-assertion': await sign(email) } : {}) },
    body: JSON.stringify(body),
  });
};
const idea = { title: 'Export to CSV', problem: 'Ops cannot export.\nThey copy by hand.', audience: 'Ops team', team: 'CORE', ownerId: 'u-bo' };

describe('GET /api/ideas/owners', () => {
  it('401 without Access', async () => {
    expect((await get('/api/ideas/owners?team=CORE', null)).status).toBe(401);
  });
  it('defaults to the viewer when they are a Linear user, open to non-engineers', async () => {
    const r = await get('/api/ideas/owners?team=CORE');
    expect(await r.json()).toEqual({
      owners: [{ id: 'u-mika', name: 'Mika', email: 'mika@jitera.com' }, { id: 'u-bo', name: 'Bo', email: 'bo@jitera.com' }],
      defaultOwnerId: 'u-mika',
    });
  });
  it('has no default when the viewer is not a Linear user (Review Focus 4)', async () => {
    const r = await get('/api/ideas/owners?team=CORE', EVE);
    expect(r.status).toBe(200);
    expect((await r.json()).defaultOwnerId).toBeNull();
  });
  it('has no default when the viewer is a Linear user but not in the team', async () => {
    const r = await get('/api/ideas/owners?team=CORE', ANN);
    expect(r.status).toBe(200);
    expect((await r.json()).defaultOwnerId).toBeNull();
  });
  it('a failing user lookup still returns the owners with no default', async () => {
    userLookupFails = true;
    const r = await get('/api/ideas/owners?team=CORE');
    expect(r.status).toBe(200);
    const b = await r.json();
    expect(b.owners).toHaveLength(2);
    expect(b.defaultOwnerId).toBeNull();
  });
  it('400 for a team that is not picked', async () => {
    expect((await get('/api/ideas/owners?team=NOPE')).status).toBe(400);
  });
});

describe('POST /api/ideas', () => {
  it('creates the Linear project with team, lead, label and the two headings', async () => {
    const r = await post(idea);
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ uuid: 'u-new', slugId: 'new-1', url: 'https://linear.app/x/project/new-1' });
    expect(bodies.find((b) => b.query.includes('BoardCreateLookup'))!.variables).toMatchObject({ key: 'CORE', label: 'flow:intent' });
    expect(bodies.at(-1)!.variables.input).toEqual({
      name: 'Export to CSV', description: 'Ops cannot export. They copy by hand.',
      content: '## Problem\n\nOps cannot export.\nThey copy by hand.\n\n## Who it is for\n\nOps team\n',
      teamIds: ['t-core'], leadId: 'u-bo', labelIds: ['l-intent'],
    });
  });
  it('400 owner_required without an owner (Review Focus 4), and Linear is not called', async () => {
    for (const ownerId of [undefined, '', '  ']) {
      const r = await post({ ...idea, ownerId });
      expect(r.status).toBe(400);
      expect((await r.json()).error).toBe('owner_required');
    }
    expect(bodies).toEqual([]);
  });
  it.each([{ title: '  ' }, { team: 'NOPE' }, { team: '' }])('400 invalid for %j', async (bad) => {
    const r = await post({ ...idea, ...bad });
    expect(r.status).toBe(400);
    expect((await r.json()).error).toBe('invalid');
  });
  it('400 when the owner is not a member of the team, and no project is created', async () => {
    const r = await post({ ...idea, ownerId: 'u-foreign' });
    expect(r.status).toBe(400);
    expect(await r.json()).toMatchObject({ error: 'invalid', problems: ['owner: not a member of this team'] });
    expect(bodies.some((b) => b.query.includes('BoardProjectCreate'))).toBe(false);
  });
  it.each([['title', 256], ['problem', 5001], ['audience', 2001]])('400 invalid naming %s when over %i characters wide', async (field, n) => {
    const r = await post({ ...idea, [field]: 'x'.repeat(n) });
    expect(r.status).toBe(400);
    const b = await r.json();
    expect(b.error).toBe('invalid');
    expect(b.problems.join()).toContain(field);
    expect(bodies).toEqual([]);
  });
  it('403 for a foreign origin', async () => {
    expect((await post(idea, { origin: 'https://evil.example.com' })).status).toBe(403);
    expect(bodies).toEqual([]);
  });
  it('401 without Access', async () => {
    expect((await post(idea, { email: null })).status).toBe(401);
  });
  it('a failing Linear is a 502 that leaks no key', async () => {
    linearFails = true;
    const r = await post(idea);
    expect(r.status).toBe(502);
    expect(await r.text()).not.toMatch(/LIN-KEY/);
  });
  it('a refused project create is a 502 that says so', async () => {
    createFails = true;
    const r = await post(idea);
    expect(r.status).toBe(502);
    expect(await r.json()).toEqual({ error: 'linear', message: 'Linear refused the project. Try again or check the title and owner.' });
  });
  it('409 no_public_url while the jflow address is not set, and Linear is not called', async () => {
    await new Promise<void>((r) => server.close(() => r()));
    await start('');
    const r = await post(idea);
    expect(r.status).toBe(409);
    expect((await r.json()).error).toBe('no_public_url');
    expect(bodies).toEqual([]);
  });
});
