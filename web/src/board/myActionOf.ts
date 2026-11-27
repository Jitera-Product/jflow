import type { BoardCard } from '@/api/types';
import { plural } from '@/lib/plural';
import { prsToReviewOf } from './prsToReviewOf';
import { qaFailedOf } from './qaFailedOf';
import { reviewWaits } from './reviewWaits';
import { stageOfLabel } from './stageOfLabel';

const GATE_NOUN: Record<string, string> = {
  Intent: 'the intent', Spec: 'the spec', 'Spec review': 'the spec', TDR: 'the TDR', UI: 'the UI', Plan: 'the plan',
};
const STAGE_WORK: Record<string, string> = {
  Intent: 'write the intent', 'Spec review': 'review the spec', TDR: 'write the TDR', UI: 'draw and approve UI',
  Plan: 'approve the plan', Verify: 'verify the release',
};

export function myActionOf(card: BoardCard): string {
  if (card.openGate) {
    const from = stageOfLabel(card.openGate.from);
    return `approve ${GATE_NOUN[from] ?? from}`;
  }
  const failed = qaFailedOf(card);
  if (failed) return `${plural(failed, 'QA check')} failed`;
  if (reviewWaits(card)) return `review ${plural(prsToReviewOf(card), 'PR')}`;
  return STAGE_WORK[card.stage] ?? 'take a look';
}
