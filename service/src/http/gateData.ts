import type { Deps } from '../feature/types.js';
import { loadFeature } from '../feature/loadFeature.js';
import { GateError } from '../gates/GateError.js';
import { nextApproval } from '../gates/nextApproval.js';
import { rolesOf } from '../gates/rolesOf.js';
import { rowIsValid } from '../gates/rowIsValid.js';
import { stageOf } from '../gates/stageOf.js';
import { readGates } from '../status/readGates.js';

export async function gateData(deps: Deps, project: string, gate: string, email: string) {
  const f = await loadFeature(deps, project);
  const row = readGates(f.status ?? '').find((r) => r.id === gate);
  if (!row) throw new GateError('not_found', `No gate ${gate} on ${f.identifier}.`);
  const valid = rowIsValid(deps.settings.get().gateSecret, f.identifier, row);
  const canDecide = valid && row.status === 'open' && nextApproval(row, email, rolesOf(f, email)) !== null;
  const reason = canDecide ? null
    : !valid ? 'This gate was changed by hand. Open a new one.'
    : row.status !== 'open' ? `This gate is closed (${row.status}).`
    : row.approvals.some((a) => a.email.toLowerCase() === email) ? 'You already approved this gate.'
    : `${email} cannot decide this gate.`;
  return {
    email, project: f.identifier, feature: f.name, from: stageOf(row.from) ?? row.from, to: stageOf(row.to) ?? row.to,
    toLabel: row.to, // sent back on a decision so jflow can check the person decided this move
    roles: row.roles, approvals: row.approvals, canDecide, reason,
  };
}
