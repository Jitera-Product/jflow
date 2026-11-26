import type { Role } from '../gates/types.js';
import type { StatusFile } from './types.js';

export function openGateOf(file: StatusFile | null): { id: string; to: string; opened: string; missing: Role[] } | null {
  const g = file?.gates.filter((r) => r.status === 'open' && r.id && r.roles.length && !Number.isNaN(Date.parse(r.opened))).at(-1);
  if (!g) return null;
  return { id: g.id, to: g.to, opened: g.opened, missing: g.roles.filter((r) => !g.approvals.some((a) => a.role === r)) };
}
