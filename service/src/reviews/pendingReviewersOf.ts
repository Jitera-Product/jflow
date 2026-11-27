const STATUS = /^[\s|*]*Status[\s*]*[:|](.*)$/im;
const HEADING = /^#{1,6}\s/;

// Names of the reviewers still to tick in "## Reviewers" (also "## **Reviewers**"); none unless the TDR is In Review.
// "- [ ]  *@Luís Vendrame*" is a person, "- [ ]  a*dd your own name*" is the template hint.
export function pendingReviewersOf(md: string): string[] {
  if (!/^[\s*]*in review\b/i.test(STATUS.exec(md)?.[1] ?? '')) return [];
  const names: string[] = [];
  let inside = false;
  for (const line of md.split('\n')) {
    if (HEADING.test(line)) {
      inside = /^#{1,6}\s+\**\s*Reviewers\s*\**\s*$/i.test(line.trim());
      continue;
    }
    const open = inside && /^\s*[-*]\s+\[ \]\s*(.*)$/.exec(line);
    const name = open ? /^@\s*(.+)$/.exec(open[1]!.replaceAll('*', '').trim())?.[1]?.trim() : undefined;
    if (name) names.push(name);
  }
  return names;
}
