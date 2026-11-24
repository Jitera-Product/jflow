import { day } from '../feature/day.js';
import { loadFeature } from '../feature/loadFeature.js';
import type { Deps } from '../feature/types.js';
import { appendLog } from '../status/appendLog.js';
import { setStage } from '../status/setStage.js';
import { STAGES, type GateRow } from '../status/stages.js';
import { upsertGate } from '../status/upsertGate.js';
import { checkRow } from './checkRow.js';
import { fresh } from './fresh.js';
import { GateError } from './GateError.js';
import { nextApproval } from './nextApproval.js';
import { rolesOf } from './rolesOf.js';
import { seal } from './seal.js';
import { stageOf } from './stageOf.js';
import { statusPath } from './statusPath.js';
import type { Decided, Decision } from './types.js';

const missingOf = (row: GateRow) => row.roles.filter((r) => !row.approvals.some((a) => a.role === r));

export async function decideGate(
  deps: Deps,
  input: { project: string; gate: string; email: string; decision: Decision; channel: string; expectedTo?: string },
): Promise<Decided> {
  const f = await loadFeature(deps, input.project);
  const path = statusPath(f);
  const who = input.email.toLowerCase();
  const date = day(deps);
  const row = checkRow(deps, f, f.status!, input.gate);
  const stage = stageOf(row.from);
  const via = `${who} via ${input.channel}`;
  if (input.expectedTo !== undefined && input.expectedTo !== row.to) {
    throw new GateError('mismatch', `This gate moves to ${row.to}, not ${input.expectedTo}. Open the gate again.`);
  }

  if (f.flowLabel === row.to) {
    throw new GateError('closed', `This gate already passed: the project is at ${row.to}. The status file may need a person to fix it.`);
  }
  if (f.flowLabel !== row.from) {
    const md = await fresh(deps, f, path, row);
    await deps.docs.update(path, upsertGate(md, seal(deps, f, { ...row, status: 'stale' })));
    throw new GateError('stale', `The project moved to ${f.flowLabel ?? 'no flow label'} after this gate opened. Open a new one.`);
  }

  const qualifies = rolesOf(deps, f, who);
  const missing = missingOf(row);

  if (input.decision === 'changes') {
    if (!missing.some((r) => qualifies.includes(r))) throw new GateError('not_allowed', `${who} cannot decide this gate.`);
    let md = upsertGate(await fresh(deps, f, path, row), seal(deps, f, { ...row, status: 'changes requested', decidedBy: who }));
    md = appendLog(md, `${date} - ${stage} changes requested - ${via}`);
    await deps.docs.update(path, md);
    return { status: 'changes requested', missing };
  }

  const role = nextApproval(row, who, qualifies);
  if (!role) {
    if (row.approvals.some((a) => a.email.toLowerCase() === who)) return { status: 'open', missing };
    throw new GateError('not_allowed', `${who} cannot approve this gate.`);
  }
  const approved = { ...row, approvals: [...row.approvals, { role, email: who }] };
  const still = missingOf(approved);
  if (still.length) {
    await deps.docs.update(path, upsertGate(await fresh(deps, f, path, row), seal(deps, f, approved)));
    return { status: 'open', missing: still };
  }

  let md = await fresh(deps, f, path, row);
  console.log(JSON.stringify({
    audit: 'gate', project: f.identifier, gate: row.id, from: row.from, to: row.to, email: who, decision: 'approve', channel: input.channel,
  }));
  await deps.tracker.setFlowLabel(f.id, row.to);
  const a = STAGES.indexOf(stage);
  const b = STAGES.indexOf(stageOf(row.to));
  md = setStage(md, STAGES[a]!, 'done', date, who);
  for (let i = a + 1; i < b; i++) md = setStage(md, STAGES[i]!, 'skipped', date, who);
  md = setStage(md, STAGES[b]!, 'in progress', date, who);
  md = upsertGate(md, seal(deps, f, { ...approved, status: 'approved', decidedBy: who }));
  md = appendLog(md, `${date} - ${stage} approved - ${via}`);
  await deps.docs.update(path, md);
  return { status: 'approved', missing: [] };
}
