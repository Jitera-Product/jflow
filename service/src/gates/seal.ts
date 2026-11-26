import type { Deps, Feature } from '../feature/types.js';
import type { GateRow } from '../status/stages.js';
import { signRow } from './signRow.js';

export const seal = (deps: Deps, f: Feature, row: GateRow): GateRow => ({ ...row, sig: signRow(deps.settings.get().gateSecret, f.identifier, row) });
