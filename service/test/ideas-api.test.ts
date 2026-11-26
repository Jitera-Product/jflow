import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { fileURLToPath } from 'node:url';
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from 'jose';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { memoryChatTokenStore } from '../src/chats/memoryChatTokenStore.js';
import { openChatTokens } from '../src/chats/openChatTokens.js';
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
const fakeLinear = (async (_url: unknown, init: { body: string }) => {
  const body = JSON.parse(init.body) as Body;
  bodies.push(body);
  if (linearFails) return new Response(JSON.stringify({ errors: [{ message: 'bad key LIN-KEY-BBB' }] }), { status: 401 });
  const op = /(?:query|mutation)\s+(\w+)/.exec(body.query)![1];
  const data = {
    BoardTeamMembers: { teams: { nodes: [{ members: { nodes: [
      { id: 'u-mika', name: 'Mika', email: 'Mika@Jitera.com', active: true },
      { id: 'u-bo', name: 'Bo', email: 'bo@jitera.com', active: true },
    ] } }] } },
    BoardUserByEmail: { users: { nodes: body.variables.email === MIKA ? [{ id: 'u-mika', name: 'Mika', email: MIKA, active: true }] : [] } },
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
beforeEach(async () => {
  bodies = [];
  linearFails = false;
  const settings = await openSettings(memorySettingsStore(), 'k'.repeat(32), { engineers: [MIKA], publicUrl: ORIGIN }, () => NOW);
  await settings.save({ docsUrl: 'https://d.example.com', docsToken: 'DOCS-TOKEN-AAA', linearApiKey: 'LIN-KEY-BBB', teams: ['ENG', 'CORE'], engineers: [MIKA] }, MIKA);
  const chats = await openChatTokens(memoryChatTokenStore(), 'k'.repeat(32), [], () => NOW);
  const deps = { config, settings, chats, docs: memoryDocuments({}), tracker: {} as never, now: () => NOW };
  server = createHttpServer(deps, { jwks, fetch: fakeLinear });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
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
});
