export function isChatLink(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && url.includes('/chat?') && !!u.searchParams.get('a');
  } catch {
    return false;
  }
}
