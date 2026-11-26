// "Linear: https://linear.app/<ws>/project/<name>-<slugId>" from the 0-status.md template
export function slugOfStatus(md: string): string | null {
  const seg = /^Linear: https?:\/\/\S+?\/project\/([^/\s]+)/m.exec(md)?.[1];
  return seg ? seg.slice(seg.lastIndexOf('-') + 1) || null : null;
}
