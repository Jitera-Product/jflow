import { LABEL_STAGE } from '../gates/moves.js';
import type { StageName } from '../status/stages.js';

const AFTER_BUILD: Record<string, StageName> = { verify: 'Verify', done: 'Done' };

export function stageOfLabel(label: string): StageName | null {
  const name = label.replace(/^flow:/, '');
  return AFTER_BUILD[name] ?? LABEL_STAGE[name] ?? null;
}
