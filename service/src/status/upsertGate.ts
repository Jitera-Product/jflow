import { cellsOf } from './cellsOf.js';
import { gateCells } from './gateCells.js';
import { gatesSection } from './gatesSection.js';
import { isRow } from './isRow.js';
import { lines } from './lines.js';
import { rowOf } from './rowOf.js';
import type { GateRow } from './stages.js';

const GATES_HEADER = '| Gate | From | To | Roles | Opened | Status | Approved by | Decided by | Sig |';
const GATES_RULE = '| --- | --- | --- | --- | --- | --- | --- | --- | --- |';

export function upsertGate(md: string, row: GateRow): string {
  const line = rowOf([...gateCells(row), row.sig]);
  const ls = lines(md);
  let s = gatesSection(ls);
  if (!s) {
    let log = ls.indexOf('## Log');
    if (log < 0) { ls.push(''); log = ls.length; }
    ls.splice(log, 0, '## Gates', '', GATES_HEADER, GATES_RULE, '');
    s = gatesSection(ls)!;
  }
  for (let k = s.head; k < s.end; k++) {
    if (isRow(ls[k]!) && cellsOf(ls[k]!)[0] === row.id) { ls[k] = line; return ls.join('\n'); }
  }
  let last = s.head;
  for (let k = s.head; k < s.end; k++) if (ls[k]!.startsWith('|')) last = k;
  ls.splice(last + 1, 0, line);
  return ls.join('\n');
}
