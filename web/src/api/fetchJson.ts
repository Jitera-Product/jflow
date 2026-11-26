import { ApiError } from './ApiError';

export async function fetchJson<T>(path: string, init: { method?: 'GET' | 'POST' | 'DELETE'; body?: unknown } = {}): Promise<T> {
  const method = init.method ?? 'GET';
  const hasBody = init.body !== undefined;
  const res = await fetch(path, {
    method,
    credentials: 'same-origin',
    // Every write says JSON, so a cross-site form can never send one without a CORS preflight.
    headers: method !== 'GET' ? { accept: 'application/json', 'content-type': 'application/json' } : { accept: 'application/json' },
    body: hasBody ? JSON.stringify(init.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? 'error', data.message, data.problems);
  return data as T;
}
