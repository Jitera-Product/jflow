import type { Deps, Feature } from '../feature/types.js';
import type { GateRow } from '../status/stages.js';
import { checkRow } from './checkRow.js';
import { GateError } from './GateError.js';

export async function fresh(deps: Deps, f: Feature, path: string, row: GateRow): Promise<string> {
  const md = (await deps.docs.read(path)) ?? '';
  if (checkRow(deps, f, md, row.id).sig !== row.sig) throw new GateError('stale', 'This gate changed while you decided. Try again.');
  return md;
}
