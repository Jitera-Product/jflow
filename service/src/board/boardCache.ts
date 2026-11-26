export type BoardCache = <T>(key: string, refresh: boolean, load: () => Promise<T>) => Promise<T>;

export function boardCache(ttlMs: number, now: () => Date): BoardCache {
  const entries = new Map<string, { at: number; value: Promise<unknown> }>();
  return <T>(key: string, refresh: boolean, load: () => Promise<T>) => {
    const hit = entries.get(key);
    if (hit && !refresh && now().getTime() - hit.at < ttlMs) return hit.value as Promise<T>;
    const value = load();
    entries.set(key, { at: now().getTime(), value });
    value.catch(() => {
      if (entries.get(key)?.value === value) entries.delete(key);
    });
    return value;
  };
}
