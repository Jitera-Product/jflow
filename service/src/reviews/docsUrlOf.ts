// Studio opens a document at /p/<slug>/docs/<its tree path, URL-encoded>, as chatUrlOf does for folders.
export function docsUrlOf(agentUrl: string, path: string): string | null {
  let url: URL;
  try {
    url = new URL(agentUrl);
  } catch {
    return null;
  }
  const slug = /^\/p\/([^/]+)\//.exec(url.pathname)?.[1];
  if (!slug) return null;
  return `${url.origin}/p/${slug}/docs/${encodeURIComponent(`/${path.replace(/^documents\//, '')}`)}`;
}
