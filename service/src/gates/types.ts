import type { GateStatus } from '../status/stages.js';

export type Role = 'owner' | 'engineer';
export type OpenedGate = { project: string; gate: string; url: string; from: string; to: string; roles: Role[] };
export type Decision = 'approve' | 'changes';
export type Decided = { status: GateStatus; missing: Role[] };
