export function gatesSection(ls: string[]): { head: number; end: number } | null {
  const head = ls.indexOf('## Gates');
  if (head < 0) return null;
  let end = ls.findIndex((l, k) => k > head && l.startsWith('## '));
  if (end < 0) end = ls.length;
  return { head, end };
}
