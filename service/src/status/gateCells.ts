import { noBreaks } from './noBreaks.js';
import type { GateRow } from './stages.js';

export function gateCells(row: Omit<GateRow, 'sig'>): string[] {
  const cells = [
    row.id, row.from, row.to, row.roles.join(', '), row.opened, row.status,
    row.approvals.map((a) => `${a.role}:${a.email}`).join(', '), row.decidedBy,
  ];
  return noBreaks(...cells);
}
