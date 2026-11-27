import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { fileURLToPath } from 'node:url';
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from 'jose';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { memoryFeatureActivityStore } from '../src/activity/memoryFeatureActivityStore.js';
import { memoryChatTokenStore } from '../src/chats/memoryChatTokenStore.js';
import { openChatTokens } from '../src/chats/openChatTokens.js';
import type { Config } from '../src/config/types.js';
import { memoryDocuments } from '../src/documents/memoryDocuments.js';
import { memoryFeatureChatStore } from '../src/featureChats/memoryFeatureChatStore.js';
import { createHttpServer } from '../src/http/createHttpServer.js';
import { memoryPersonalSettingsStore } from '../src/personal/memoryPersonalSettingsStore.js';
import { memorySettingsStore } from '../src/settings/memorySettingsStore.js';
import { openSecret } from '../src/settings/openSecret.js';
import { openSettings } from '../src/settings/openSettings.js';

const TEAM = 'team.cloudflareaccess.com';
const AUD = 'aud-1';
const ORIGIN = 'https://flow.example.com';
const FWD = { 'x-forwarded-proto': 'https', 'x-forwarded-host': 'flow.example.com' };
const KEY = 'k'.repeat(32);
const MIKA = 'mika@jitera.com';
const EVE = 'eve@jitera.com';
const WEB = fileURLToPath(new URL('./fixtures/web', import.meta.url));
const config = { flowFolder: 'documents/Flow', templatesDir: '', webDir: WEB, access: { teamDomain: TEAM, aud: AUD }, settingsKey: KEY } as Config;
const NOW = new Date('2026-11-27T12:00:00.000Z');
const PR_URL = 'https://github.com/acme/frontend-core/pull/2301';

const FILES = {
  'documents/Flow/P-ENG-18 Alerts/0-status.md': `# Status - P-ENG-18 Alerts

Linear: https://linear.app/x/project/alerts-s18

## Build

| Issue | Repo | Branch | Base | PR | Status |
| --- | --- | --- | --- | --- | --- |
| ENG-1 | acme/frontend-core | b1 | main | ${PR_URL} | in review |
`,
  'documents/Technical Design Record (TDR)/TDR-Customer-keys.md': 'Status: In Review\n\n## **Reviewers**\n\n- [ ]  @Mika Sato\n- [x]  @Kevin Nguyen\n',
  'documents/Technical Design Record (TDR)/TDR Done.md': 'Status: Accepted\n\n## Reviewers\n\n- [ ]  @Mika Sato\n',
  'documents/Technical Design Record (TDR)/TDR Other.md': 'Status: In Review\n\n## Reviewers\n\n- [ ]  @Kevin Nguyen\n',
};

const item = (n: number, url: string, repo: string) => ({
  number: n, title: `PR ${n}`, html_url: url, repository_url: `https://api.github.com/repos/${repo}`,
  updated_at: '2026-11-27T11:20:00Z', user: { login: 'bo' },
});
let githubFails: boolean;
let githubCalls: string[];
let linearCalls: string[];
const fakeFetch = (async (url: unknown, init: { body?: string; headers?: Record<string, string> }) => {
  const u = String(url);
  if (u.startsWith('https://api.github.com/')) {
    const path = u.slice('https://api.github.com'.length);
    githubCalls.push(path);
    if (init.headers?.authorization === 'Bearer BAD' || githubFails) return new Response('{}', { status: 401 });
    if (path === '/user') return new Response(JSON.stringify({ login: 'mika-gh' }), { status: 200 });
    if (path.startsWith('/search/issues?')) {
      return new Response(JSON.stringify({ items: [item(2301, PR_URL, 'acme/frontend-core'), item(7, 'https://github.com/acme/boost/pull/7', 'acme/boost')] }), { status: 200 });
    }
    return new Response('{}', { status: 404 });
  }
  const { query, variables } = JSON.parse(init.body!);
  if (query.includes('BoardUserByEmail')) {
    linearCalls.push('user');
    const users = variables.email === MIKA ? [{ id: 'u1', name: 'mika@jitera.com', displayName: 'Mika Sato', email: MIKA, active: true }] : [];
    return new Response(JSON.stringify({ data: { users: { nodes: users } } }), { status: 200 });
  }
  linearCalls.push('projects');
  const nodes = [{
    id: 'u-s18', slugId: 's18', name: 'Usage alerts in Slack', url: 'https://linear.app/x/project/alerts-s18',
    updatedAt: '2026-11-20T00:00:00.000Z', status: { type: 'started' }, lead: { name: 'Mika', email: MIKA },
    teams: { nodes: [{ key: 'ENG' }] }, labels: { nodes: [{ name: 'flow:build' }] },
  }];
  return new Response(JSON.stringify({ data: { projects: { pageInfo: { hasNextPage: false, endCursor: null }, nodes } } }), { status: 200 });
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
let personal: ReturnType<typeof memoryPersonalSettingsStore>;
beforeEach(async () => {
  githubFails = false;
  githubCalls = [];
  linearCalls = [];
  const settings = await openSettings(memorySettingsStore(), KEY, { engineers: [MIKA] }, () => NOW);
  await settings.save({
    docsUrl: 'https://d.example.com', docsToken: 'DOCS', linearApiKey: 'LIN', teams: ['ENG'], engineers: [MIKA],
    flowAgentUrl: 'https://studio.jitera.app/p/core/chat?a=agent-1',
  }, MIKA);
  const chats = await openChatTokens(memoryChatTokenStore(), KEY, [], () => NOW);
  personal = memoryPersonalSettingsStore();
  const deps = {
    config, settings, chats, featureChats: memoryFeatureChatStore(), activity: memoryFeatureActivityStore(), personal,
    docs: memoryDocuments(FILES), tracker: {} as never, now: () => NOW,
  };
  server = createHttpServer(deps, { jwks, fetch: fakeFetch });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});
afterEach(() => new Promise<void>((r) => server.close(() => r())));

const call = async (method: string, path: string, body?: unknown, email: string | null = MIKA) => fetch(base + path, {
  method,
  headers: { ...(email ? { 'cf-access-jwt-assertion': await sign(email) } : {}), origin: ORIGIN, ...FWD, 'content-type': 'application/json' },
  body: body === undefined ? undefined : JSON.stringify(body),
});
const connect = (token: string, email = MIKA) => call('POST', '/api/me/github', { token }, email);

describe('personal GitHub token', () => {
  it('stores the token sealed with the login, never returns it, and forgets it', async () => {
    const r = await connect('GOOD-TOKEN');
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ login: 'mika-gh' });
    const saved = personal.rows.get(MIKA)!;
    expect(saved.login).toBe('mika-gh');
    expect(saved.token).not.toContain('GOOD-TOKEN');
    expect(openSecret(KEY, saved.token)).toBe('GOOD-TOKEN');
    const me = await (await call('GET', '/api/me')).text();
    expect(JSON.parse(me).github).toEqual({ login: 'mika-gh' });
    expect(me).not.toContain('GOOD-TOKEN');
    expect(me).not.toContain(saved.token);
    expect((await call('DELETE', '/api/me/github')).status).toBe(204);
    expect(JSON.parse(await (await call('GET', '/api/me')).text()).github).toBeNull();
  });
  it('400 when GitHub does not accept the token, and nothing is stored', async () => {
    const r = await connect('BAD');
    expect(r.status).toBe(400);
    expect(await r.json()).toEqual({ error: 'github', message: 'GitHub did not accept this token.' });
    expect((await connect('  ')).status).toBe(400);
    expect(personal.rows.size).toBe(0);
  });
  it('any signed-in person can connect, from the same origin only', async () => {
    expect((await connect('GOOD-TOKEN', EVE)).status).toBe(200);
    expect(personal.rows.get(EVE)?.login).toBe('mika-gh');
    expect((await call('POST', '/api/me/github', { token: 'x' }, null)).status).toBe(401);
    const cross = await fetch(base + '/api/me/github', {
      method: 'POST', headers: { 'cf-access-jwt-assertion': await sign(MIKA), origin: 'https://evil.example.com', 'content-type': 'application/json' },
      body: JSON.stringify({ token: 'GOOD-TOKEN' }),
    });
    expect(cross.status).toBe(403);
  });
});

describe('/api/waiting/reviews', () => {
  const reviews = async (email = MIKA) => (await call('GET', '/api/waiting/reviews', undefined, email)).json();
  const MY_TDR = {
    title: 'Customer keys', path: 'documents/Technical Design Record (TDR)/TDR-Customer-keys.md',
    url: 'https://studio.jitera.app/p/core/docs/%2FTechnical%20Design%20Record%20(TDR)%2FTDR-Customer-keys.md',
  };

  it('without a token: github none, no PRs, and the TDRs where I am an unchecked reviewer', async () => {
    expect(await reviews()).toEqual({ github: 'none', prs: [], tdrs: [MY_TDR] });
    expect(githubCalls).toEqual([]);
  });
  it('with a token: the PRs asking for my review, joined to the flow feature by the Build table URL', async () => {
    await connect('GOOD-TOKEN');
    const r = await reviews();
    expect(r.github).toBe('ok');
    expect(r.prs).toEqual([
      { repo: 'acme/frontend-core', number: 2301, title: 'PR 2301', url: PR_URL, author: 'bo', updatedAt: '2026-11-27T11:20:00Z', feature: { key: 'P-ENG-18', name: 'Usage alerts in Slack' } },
      { repo: 'acme/boost', number: 7, title: 'PR 7', url: 'https://github.com/acme/boost/pull/7', author: 'bo', updatedAt: '2026-11-27T11:20:00Z', feature: null },
    ]);
    expect(githubCalls).toContain('/search/issues?q=is:pr+is:open+archived:false+review-requested:@me&sort=updated&per_page=50');
  });
  it('caches the PR search, the board, the Linear user and the TDR scan', async () => {
    await connect('GOOD-TOKEN');
    await reviews();
    await reviews();
    expect(githubCalls.filter((p) => p.startsWith('/search/'))).toHaveLength(1);
    expect(linearCalls.sort()).toEqual(['projects', 'user']);
  });
  it('GitHub failing: github failed, no PRs, a warning, the TDRs still', async () => {
    await connect('GOOD-TOKEN');
    githubFails = true;
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(await reviews()).toEqual({ github: 'failed', prs: [], tdrs: [MY_TDR] });
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/reviews for mika@jitera.com.*401/));
    warn.mockRestore();
  });
  it('someone Linear does not know reviews no TDR', async () => {
    expect(await reviews(EVE)).toEqual({ github: 'none', prs: [], tdrs: [] });
  });
  it('401 without Access', async () => {
    expect((await call('GET', '/api/waiting/reviews', undefined, null)).status).toBe(401);
  });
});
