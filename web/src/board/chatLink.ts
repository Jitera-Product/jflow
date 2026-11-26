// null when the stored link is not a URL, so the panel shows no link instead of failing
export function chatLink(agentUrl: string, folder: string): string | null {
  try {
    const url = new URL(agentUrl);
    url.searchParams.set('folder', folder);
    return url.toString();
  } catch {
    return null;
  }
}
