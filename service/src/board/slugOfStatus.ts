// The line is written as "Linear: <url>", "Linear: url" or "Linear: [text](url)"; slugId is the last "-" part of the project segment.
export function slugOfStatus(md: string): string | null {
  const seg = /^Linear:.*?https?:\/\/[^\s<>()]+?\/project\/([^/\s<>()\]]+)/m.exec(md)?.[1];
  return seg ? seg.slice(seg.lastIndexOf('-') + 1) || null : null;
}
