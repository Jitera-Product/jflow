// Studio opens a folder at /docs/<its tree path, URL-encoded>: no "documents/" prefix, no trailing slash.
// Without a folder and a chat it is a new chat with the agent.
export function chatUrlOf(agentUrl: string, folder: string | null, chatId: string | null): string | null {
  let url: URL;
  try {
    url = new URL(agentUrl);
  } catch {
    return null;
  }
  const slug = /^\/p\/([^/]+)\//.exec(url.pathname)?.[1];
  const agent = url.searchParams.get('a');
  if (!slug || !agent) return null;
  const query = `?a=${encodeURIComponent(agent)}${chatId ? `&c=${encodeURIComponent(chatId)}` : ''}`;
  if (!folder) return `${url.origin}/p/${slug}/chat${query}`;
  const path = `/${folder.replace(/^documents\//, '').replace(/\/+$/, '')}`;
  return `${url.origin}/p/${slug}/docs/${encodeURIComponent(path)}${query}`;
}
