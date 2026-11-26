import type { BoardData } from './types.js';

export type BoardCache = (key: string, refresh: boolean, load: () => Promise<BoardData>) => Promise<BoardData>;

export function boardCache(ttlMs: number, now: () => Date): BoardCache {
  const entries = new Map<string, { at: number; value: Promise<BoardData> }>();
  return (key, refresh, load) => {
    const hit = entries.get(key);
    if (hit && !refresh && now().getTime() - hit.at < ttlMs) return hit.value;
    const value = load();
    entries.set(key, { at: now().getTime(), value });
    value.catch(() => {
      if (entries.get(key)?.value === value) entries.delete(key);
    });
    return value;
  };
}
