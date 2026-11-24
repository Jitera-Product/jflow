import { loadFeature } from '../feature/loadFeature.js';
import type { Deps } from '../feature/types.js';
import { readGates } from '../status/readGates.js';
import { upsertGate } from '../status/upsertGate.js';
import { GateError } from './GateError.js';
import { GATE_MOVES } from './moves.js';
import { newGateId } from './newGateId.js';
import { openTechQuestions } from './openTechQuestions.js';
import { rolesFor } from './rolesFor.js';
import { rowIsValid } from './rowIsValid.js';
import { seal } from './seal.js';
import { statusPath } from './statusPath.js';
import { tdrNeeded } from './tdrNeeded.js';
import type { OpenedGate } from './types.js';
import { undecidedConcerns } from './undecidedConcerns.js';

export async function openGate(deps: Deps, ref: string, to: string): Promise<OpenedGate> {
  const f = await loadFeature(deps, ref);
  const path = statusPath(f);
  const from = f.flowLabel ?? '';
  if (!GATE_MOVES[from]?.includes(to)) {
    const allowed = GATE_MOVES[from]?.join(', ') || 'none';
    throw new GateError('not_allowed', `${from || 'No flow label'} to ${to} is not a gate. Gates from here: ${allowed}.`);
  }
  const spec = from === 'flow:spec-review' ? (await deps.docs.read(`${f.folder}/2-spec.md`)) ?? '' : '';
  const blockers =
    from === 'flow:spec-review' ? undecidedConcerns(spec)
    : from === 'flow:plan' ? openTechQuestions((await deps.docs.read(`${f.folder}/3-plan.md`)) ?? '')
    : [];
  if (blockers.length) throw new GateError('not_ready', `Decide these first: ${blockers.join('; ')}`);
  if (from === 'flow:spec-review' && (to === 'flow:ui' || to === 'flow:plan') && tdrNeeded(spec)) {
    throw new GateError('not_ready', 'The spec says a TDR is needed. Open the gate to flow:tdr.');
  }

  let md = (await deps.docs.read(path)) ?? '';
  const url = (id: string) => `${deps.config.publicUrl}/gate/${f.identifier}/${id}`;
  const open = readGates(md).filter((r) => r.status === 'open' && rowIsValid(deps.config.gateSecret, f.identifier, r));
  const same = open.find((r) => r.from === from && r.to === to);
  if (same) return { project: f.identifier, gate: same.id, url: url(same.id), from, to, roles: same.roles };

  for (const r of open) md = upsertGate(md, seal(deps, f, { ...r, status: 'replaced' }));
  const row = seal(deps, f, {
    id: newGateId(), from, to, roles: rolesFor(from, to), opened: deps.now().toISOString(),
    status: 'open', approvals: [], decidedBy: '', sig: '',
  });
  await deps.docs.update(path, upsertGate(md, row));
  return { project: f.identifier, gate: row.id, url: url(row.id), from, to, roles: row.roles };
}
