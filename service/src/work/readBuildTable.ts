import { prLinkOf } from './prLinkOf.js';
import type { BuildRow } from './types.js';

// The "## Build" table of 0-status.md: | Issue | Repo | Branch | Base | PR | Status |.
export function readBuildTable(ls: string[]): BuildRow[] {
  const head = ls.findIndex((l) => l.trim() === '## Build');
  if (head < 0) return [];
  const rows: BuildRow[] = [];
  for (const raw of ls.slice(head + 1)) {
    const l = raw.trim();
    if (l.startsWith('## ')) break;
    if (!l.startsWith('|') || /^[|\s:-]+$/.test(l)) continue;
    const c = l.replace(/^\||\|$/g, '').split('|').map((s) => s.trim());
    if (!c[0] || c[0].toLowerCase() === 'issue') continue;
    rows.push({ issue: c[0], ...prLinkOf(c[4] ?? '', c[1] ?? ''), status: (c[5] ?? '').toLowerCase().replace(/\s+/g, ' '), github: null });
  }
  return rows;
}
