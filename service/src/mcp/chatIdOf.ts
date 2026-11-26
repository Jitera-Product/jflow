const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// the Studio chat a tool call came from, sent by Boost in the request _meta
export function chatIdOf(meta: Record<string, unknown> | undefined): string | null {
  const chat = meta?.['jitera/chat'];
  const id = chat && typeof chat === 'object' ? (chat as { id?: unknown }).id : undefined;
  return typeof id === 'string' && UUID.test(id) ? id.toLowerCase() : null;
}
