import { timingSafeEqual } from 'node:crypto';
import type { GateRow } from '../status/stages.js';
import { signRow } from './signRow.js';

export function rowIsValid(secret: string, project: string, row: GateRow): boolean {
  try {
    const want = Buffer.from(signRow(secret, project, row));
    const got = Buffer.from(row.sig);
    return want.length === got.length && timingSafeEqual(want, got);
  } catch {
    return false;
  }
}
