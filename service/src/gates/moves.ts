import type { StageName } from '../status/stages.js';

export const GATE_MOVES: Record<string, string[]> = {
  'flow:intent': ['flow:spec'],
  'flow:spec-review': ['flow:tdr', 'flow:ui', 'flow:plan'],
  'flow:tdr': ['flow:ui', 'flow:plan'],
  'flow:ui': ['flow:plan'],
  'flow:plan': ['flow:build'],
};
export const AGENT_MOVES: Record<string, string[]> = {
  '': ['flow:intent'],
  'flow:spec': ['flow:spec-review'],
};
export const LABEL_STAGE: Record<string, StageName> = {
  intent: 'Intent', spec: 'Spec', 'spec-review': 'Spec review', tdr: 'TDR', ui: 'UI', plan: 'Plan', build: 'Build',
};
