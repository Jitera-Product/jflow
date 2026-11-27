import { cellsOf } from '../status/cellsOf.js';
import { STAGES, type StageName } from '../status/stages.js';
import type { StageRow } from './types.js';

export function readStageRows(ls: string[]): StageRow[] {
  return ls.filter((l) => l.startsWith('| ')).map(cellsOf)
    .filter((c) => (STAGES as readonly string[]).includes(c[1]!))
    .map((c) => ({ stage: c[1] as StageName, status: c[2] ?? '', date: c[4] ?? '', file: c[3] === '-' ? '' : c[3] ?? '', by: c[5] ?? '' }));
}
