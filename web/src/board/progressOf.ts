import { STAGES } from './STAGES';

export const progressOf = (stage: string): number => (STAGES.indexOf(stage) + 1) / STAGES.length;
