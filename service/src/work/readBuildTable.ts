import { plainCell } from './plainCell.js';
import { prLinkOf } from './prLinkOf.js';
import { statusKeyOf } from './statusKeyOf.js';
import type { BuildRow } from './types.js';

const cellsOf = (l: string) => l.replace(/^\||\|$/g, '').split('|').map(plainCell);

// The "## Build" table of 0-status.md. Columns are found by their header, since older files have no Branch column.
export function readBuildTable(ls: string[]): BuildRow[] {
  const head = ls.findIndex((l) => l.trim() === '## Build');
  if (head < 0) return [];
  const rows: BuildRow[] = [];
  let col: Record<string, number> | null = null;
  for (const raw of ls.slice(head + 1)) {
    const l = raw.trim();
    if (l.startsWith('## ')) break;
    if (!l.startsWith('|') || /^[|\s:-]+$/.test(l)) continue;
    const c = cellsOf(l);
    if (!col) {
      col = Object.fromEntries(c.map((h, i) => [h.toLowerCase(), i]));
      continue;
    }
    const at = (name: string) => (col![name] === undefined ? '' : c[col![name]!] ?? '');
    if (!at('issue')) continue;
    rows.push({ issue: at('issue'), ...prLinkOf(at('pr'), at('repo')), status: statusKeyOf(at('status')), github: null });
  }
  return rows;
}
