import type { Role } from '../gates/types.js';

export const STAGES = ['Intent', 'Spec', 'Spec review', 'TDR', 'UI', 'Plan', 'Build', 'Verify', 'Done'] as const;
export type StageName = typeof STAGES[number];
export type StageStatus = 'not started' | 'in progress' | 'done' | 'skipped';
export type GateStatus = 'open' | 'approved' | 'changes requested' | 'stale' | 'replaced';
export type GateRow = {
  id: string; from: string; to: string; roles: Role[];
  opened: string; // ISO date-time
  status: GateStatus;
  approvals: Array<{ role: Role; email: string }>;
  decidedBy: string; // email or ''
  sig: string;
};
