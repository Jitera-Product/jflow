import type { Role } from '../gates/types.js';

export type GateView = {
  project: string; feature: string; from: string; to: string;
  roles: Role[]; approvals: Array<{ role: Role; email: string }>;
  email: string;
  toLabel: string; // the row's to label, sent back so jflow can check the person decided this move
  csrf: string | null; // the buttons show only with a csrf
  reason: string | null; // why there are no buttons
  error: string | null; // a refused decision
};
