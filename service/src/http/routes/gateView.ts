import { loadFeature } from '../../feature/loadFeature.js';
import { GateError } from '../../gates/GateError.js';
import { nextApproval } from '../../gates/nextApproval.js';
import { rolesOf } from '../../gates/rolesOf.js';
import { rowIsValid } from '../../gates/rowIsValid.js';
import { stageOf } from '../../gates/stageOf.js';
import { gatePage } from '../../page/gatePage.js';
import { readGates } from '../../status/readGates.js';
import { csrfOf } from '../csrfOf.js';
import type { HttpContext } from '../types.js';

export async function gateView(ctx: HttpContext, project: string, gate: string, email: string, error: string | null = null): Promise<string> {
  const { deps } = ctx;
  const f = await loadFeature(deps, project);
  const row = readGates(f.status ?? '').find((r) => r.id === gate);
  if (!row) throw new GateError('not_found', `No gate ${gate} on ${f.identifier}.`);
  const valid = rowIsValid(deps.config.gateSecret, f.identifier, row);
  const canDecide = valid && row.status === 'open' && nextApproval(row, email, rolesOf(deps, f, email)) !== null;
  const reason = canDecide ? null
    : !valid ? 'This gate was changed by hand. Open a new one.'
    : row.status !== 'open' ? `This gate is closed (${row.status}).`
    : row.approvals.some((a) => a.email.toLowerCase() === email) ? 'You already approved this gate.'
    : `${email} cannot decide this gate.`;
  return gatePage({
    project: f.identifier, feature: f.name, from: stageOf(row.from) ?? row.from, to: stageOf(row.to) ?? row.to,
    roles: row.roles, approvals: row.approvals, email, toLabel: row.to, csrf: canDecide ? csrfOf(ctx.csrfKey, gate, email) : null, reason, error,
  });
}
