import type { FlowProject } from '../linear/types.js';
import type { QaCheck } from '../qa/types.js';
import { STAGES } from '../status/stages.js';
import { cardOf } from './cardOf.js';
import { stageOfLabel } from './stageOfLabel.js';
import type { Card, StageBoard, StatusFile } from './types.js';

const DONE_KEEP_DAYS = 14;
const NOTICE = 'jflow could not read the status files in Jitera. Stages come from Linear only.';

export function buildStageBoard(
  input: {
    projects: FlowProject[]; files: Map<string, StatusFile | null>; ids: Map<string, string>;
    checksBySlug?: Map<string, QaCheck[]>; active?: Set<string>;
    viewer: string; mine: boolean; older: boolean; filesFailed: boolean;
  },
  now: Date,
): StageBoard {
  const cards: Card[] = [];
  for (const p of input.projects) {
    const label = stageOfLabel(p.flowLabel);
    if (!label) continue;
    const file = input.filesFailed ? null : input.files.get(p.slugId) ?? null;
    const stage = file?.stage ?? label;
    const id = input.ids.get(p.slugId) ?? null;
    const c = cardOf(p, stage, file, id, input.viewer, now, {
      checks: input.checksBySlug?.get(p.slugId) ?? [],
      active: !!id && !!input.active?.has(id.toUpperCase()),
    });
    if (stage === 'Done' && c.days > DONE_KEEP_DAYS && !input.older) continue;
    if (input.mine && !c.waitingForMe) continue;
    cards.push(c);
  }
  return {
    columns: STAGES.map((stage) => ({ stage, cards: cards.filter((c) => c.stage === stage) })),
    stuck: cards.filter((c) => c.stuck).length,
    notice: input.filesFailed ? NOTICE : null,
    at: now.toISOString(),
  };
}
