import type { Role } from '../gates/types.js';
import { cellsOf } from './cellsOf.js';
import { gatesSection } from './gatesSection.js';
import { isRow } from './isRow.js';
import { lines } from './lines.js';
import type { GateRow, GateStatus } from './stages.js';

export function readGates(md: string): GateRow[] {
  const ls = lines(md);
  const s = gatesSection(ls);
  if (!s) return [];
  return ls.slice(s.head, s.end).filter(isRow).map((l) => {
    const c = cellsOf(l);
    while (c.length < 9) c.push(''); // a hand-edited row may miss cells; its sig will not match
    return {
      id: c[0]!, from: c[1]!, to: c[2]!,
      roles: c[3] ? (c[3].split(', ') as Role[]) : [],
      opened: c[4]!, status: c[5] as GateStatus,
      approvals: c[6] ? c[6].split(', ').map((p) => {
        const k = p.indexOf(':');
        return { role: p.slice(0, k) as Role, email: p.slice(k + 1) };
      }) : [],
      decidedBy: c[7]!, sig: c[8]!,
    };
  });
}
