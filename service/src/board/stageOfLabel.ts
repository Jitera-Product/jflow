import { LABEL_STAGE } from '../gates/moves.js';
import type { StageName } from '../status/stages.js';

export function stageOfLabel(label: string): StageName | null {
  const name = label.replace(/^flow:/, '');
  return name === 'done' ? 'Done' : LABEL_STAGE[name] ?? null;
}
