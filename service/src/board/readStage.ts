import { cellsOf } from '../status/cellsOf.js';
import { STAGES, type StageName } from '../status/stages.js';

export function readStage(ls: string[]): StageName | null {
  for (const l of ls) {
    if (!l.startsWith('| ')) continue;
    const c = cellsOf(l);
    if (c[2] === 'in progress' && (STAGES as readonly string[]).includes(c[1]!)) return c[1] as StageName;
  }
  return ls.some((l) => l.startsWith('| ') && cellsOf(l)[1] === 'Done' && cellsOf(l)[2] === 'done') ? 'Done' : null;
}
