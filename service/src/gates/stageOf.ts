import type { StageName } from '../status/stages.js';
import { LABEL_STAGE } from './moves.js';

export const stageOf = (label: string): StageName => LABEL_STAGE[label.replace(/^flow:/, '')]!;
