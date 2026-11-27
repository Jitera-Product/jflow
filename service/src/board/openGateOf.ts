import type { OpenGate, StatusFile } from './types.js';

export function openGateOf(file: StatusFile | null): OpenGate | null {
  const g = file?.gates.filter((r) => r.status === 'open' && r.id && r.roles.length && !Number.isNaN(Date.parse(r.opened))).at(-1);
  if (!g) return null;
  return { id: g.id, from: g.from, to: g.to, opened: g.opened, missing: g.roles.filter((r) => !g.approvals.some((a) => a.role === r)) };
}
