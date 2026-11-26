export function bareOrigin(url: string): string | null {
  try {
    const u = new URL(url);
    const ok = (u.protocol === 'https:' || u.protocol === 'http:') && u.pathname === '/' && !u.search && !u.hash && !u.username && !u.password;
    return ok ? u.origin : null;
  } catch {
    return null;
  }
}
