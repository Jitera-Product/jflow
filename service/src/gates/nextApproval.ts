import type { GateRow } from '../status/stages.js';
import type { Role } from './types.js';

export function nextApproval(row: GateRow, email: string, qualifies: Role[]): Role | null {
  const who = email.toLowerCase();
  if (row.approvals.some((a) => a.email.toLowerCase() === who)) return null;
  return row.roles.find((r) => qualifies.includes(r) && !row.approvals.some((a) => a.role === r)) ?? null;
}
