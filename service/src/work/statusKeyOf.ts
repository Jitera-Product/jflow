const KNOWN = ['waiting for answer', 'in review', 'building', 'waiting', 'merged'];

// Agents add notes after the status, like "in review (approved)" or "merged into #14229".
export function statusKeyOf(cell: string): string {
  const s = cell.toLowerCase().replace(/\s+/g, ' ').trim();
  return KNOWN.find((k) => s === k || s.startsWith(`${k} `)) ?? s;
}
