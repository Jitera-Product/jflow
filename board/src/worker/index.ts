// Cloudflare Worker: serves the board page (static assets), GET /api/board and GET /api/options.
// Access control is not in this code: put the Worker behind Cloudflare Access
// (or another identity-aware proxy) and keep workers.dev disabled.

import { buildBoard, DEFAULT_SETTINGS } from '../shared/model.js';
import { fetchBoardInput, fetchFilterOptions } from './linear.js';

export type Env = {
  ASSETS: Fetcher;
  LINEAR_API_KEY: string;
  CACHE_MINUTES?: string;
};

const WINDOWS = new Set(['-P14D', '-P30D', '-P90D']);
const ID = /^[A-Za-z0-9-]{1,64}$/;
const ids = (v: string | null): string[] | null => {
  const list = (v ?? '').split(',').filter(Boolean);
  return list.length <= 50 && list.every((x) => ID.test(x)) ? [...new Set(list)].sort() : null;
};

const json = (body: unknown, status = 200, extra: Record<string, string> = {}): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', ...extra } });

async function cached(req: Request, key: string, env: Env, ctx: ExecutionContext, make: () => Promise<unknown>): Promise<Response> {
  const minutes = Number(env.CACHE_MINUTES ?? '10') || 10;
  const cacheKey = new Request(`${new URL(req.url).origin}/__cache/${key}`);
  if (new URL(req.url).searchParams.get('refresh') !== '1') {
    const hit = await caches.default.match(cacheKey);
    if (hit) return hit;
  }
  try {
    const body = JSON.stringify(await make());
    const headers = { 'content-type': 'application/json; charset=utf-8', 'cache-control': `max-age=${minutes * 60}` };
    ctx.waitUntil(caches.default.put(cacheKey, new Response(body, { headers })));
    return new Response(body, { headers: { ...headers, 'cache-control': `private, max-age=${minutes * 60}` } });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Linear request failed' }, 502);
  }
}

async function board(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(req.url);
  const window = url.searchParams.get('window') ?? '-P30D';
  if (!WINDOWS.has(window)) return json({ error: 'window must be one of -P14D, -P30D, -P90D' }, 400);
  const teams = ids(url.searchParams.get('team'));
  const statuses = ids(url.searchParams.get('status'));
  if (!teams || !statuses) return json({ error: 'team and status must be comma-separated Linear ids' }, 400);

  return cached(req, `board/${teams.join(',')}/${statuses.join(',')}/${window}`, env, ctx, async () => {
    const input = await fetchBoardInput({ apiKey: env.LINEAR_API_KEY, teams, statuses, window, paceDays: DEFAULT_SETTINGS.paceDays });
    return { ...buildBoard(input, Date.now()), window, updatedAt: new Date().toISOString() };
  });
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const { pathname } = new URL(req.url);
    if (pathname.startsWith('/api/')) {
      if (req.method !== 'GET') return json({ error: 'method not allowed' }, 405);
      if (!env.LINEAR_API_KEY) return json({ error: 'LINEAR_API_KEY must be set' }, 500);
      if (pathname === '/api/board') return board(req, env, ctx);
      if (pathname === '/api/options') return cached(req, 'options', env, ctx, () => fetchFilterOptions(env.LINEAR_API_KEY));
      return json({ error: 'not found' }, 404);
    }
    return env.ASSETS.fetch(req);
  },
} satisfies ExportedHandler<Env>;
