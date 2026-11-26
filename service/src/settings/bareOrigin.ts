export function bareOrigin(url: string): string | null {
  try {
    const u = new URL(url);
    const ok = (u.protocol === 'https:' || u.protocol === 'http:') && u.pathname === '/' && !u.search && !u.hash;
    return ok ? url.replace(/\/$/, '') : null;
  } catch {
    return null;
  }
}
