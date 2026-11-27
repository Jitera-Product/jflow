import { STAGES } from './STAGES';

// "flow:spec-review" -> "Spec review"; an unknown label stays as it is
export const stageOfLabel = (label: string): string =>
  STAGES.find((s) => `flow:${s.toLowerCase().replace(' ', '-')}` === label) ?? label;
