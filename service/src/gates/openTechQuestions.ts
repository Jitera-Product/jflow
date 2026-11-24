export function openTechQuestions(planMd: string): string[] {
  const ls = planMd.split('\n');
  const start = ls.findIndex((l) => l.startsWith('**Open technical questions.**'));
  if (start < 0) return [];
  const out: string[] = [];
  for (let i = start + 1; i < ls.length && !ls[i]!.startsWith('## '); i++) {
    if (ls[i]!.startsWith('- ')) out.push(ls[i]!.trim());
  }
  return out;
}
