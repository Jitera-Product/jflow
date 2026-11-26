import { vi } from 'vitest';

type Answer = Response | (() => Response | Promise<Response>);

export const reply = (status: number, body?: unknown) =>
  body === undefined ? new Response(null, { status }) : new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

// Stubs fetch by "METHOD path". An array answers one call per item, then repeats the last one.
export function routeFetch(routes: Record<string, Answer | Answer[]>) {
  const f = vi.fn(async (url: string, init?: RequestInit) => {
    const key = `${init?.method ?? 'GET'} ${url}`;
    const route = routes[key];
    if (!route) throw new Error(`no stub for ${key}`);
    const answer = Array.isArray(route) ? (route.length > 1 ? route.shift()! : route[0]!) : route;
    const res = typeof answer === 'function' ? await answer() : answer;
    return res.clone();
  });
  vi.stubGlobal('fetch', f);
  return f;
}

export const callsTo = (f: ReturnType<typeof routeFetch>, method: string, url: string) =>
  f.mock.calls.filter(([u, init]) => u === url && (init?.method ?? 'GET') === method);

export const bodyOf = (f: ReturnType<typeof routeFetch>, method: string, url: string, n = 0) =>
  JSON.parse(String(callsTo(f, method, url)[n]![1]!.body));
