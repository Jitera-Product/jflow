export function undecidedConcerns(specMd: string): string[] {
  const ls = specMd.split('\n');
  const start = ls.findIndex((l) => l.startsWith('**Flagged concerns.**'));
  if (start < 0) return [];
  const out: string[] = [];
  for (let i = start + 1; i < ls.length; i++) {
    if (!/^\d+\.\s.*Decide:/.test(ls[i]!)) continue;
    const next = ls.slice(i + 1).find((l) => l.trim() !== '');
    if (!next || !/^\s*Decision:\s*\S/.test(next) || /^\s*Decision:\s*undecided\b/i.test(next)) out.push(ls[i]!.trim());
  }
  return out;
}
