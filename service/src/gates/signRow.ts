import { createHmac } from 'node:crypto';
import { gateCells } from '../status/gateCells.js';
import type { GateRow } from '../status/stages.js';

export function signRow(secret: string, project: string, row: Omit<GateRow, 'sig'>): string {
  return createHmac('sha256', secret).update([project, ...gateCells(row)].join('|')).digest('hex');
}
