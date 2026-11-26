import type { Deps, Feature } from '../feature/types.js';
import { readGates } from '../status/readGates.js';
import type { GateRow } from '../status/stages.js';
import { GateError } from './GateError.js';
import { rowIsValid } from './rowIsValid.js';

export function checkRow(deps: Deps, f: Feature, md: string, gate: string): GateRow {
  const row = readGates(md).find((r) => r.id === gate);
  if (!row) throw new GateError('not_found', `No gate ${gate} on ${f.identifier}.`);
  if (!rowIsValid(deps.settings.get().gateSecret, f.identifier, row)) throw new GateError('invalid', 'This gate was changed by hand. Open a new one.');
  if (row.status !== 'open') throw new GateError('closed', `This gate is closed (${row.status}).`);
  return row;
}
