import type { BoardCard } from '@/api/types';
import type { PillTone } from './Pill';

export type CardChip = { text: string; tone: PillTone; mono?: boolean };

const MAX_PRS = 3;

export function cardChipsOf(card: BoardCard): CardChip[] {
  const out: CardChip[] = [];
  if (card.stage === 'Build') {
    const prs = card.build.filter((r) => r.pr !== null);
    for (const r of prs.slice(0, MAX_PRS)) out.push({ text: `${r.repo} #${r.pr}`, tone: 'outline', mono: true });
    if (prs.length > MAX_PRS) out.push({ text: `+${prs.length - MAX_PRS}`, tone: 'outline', mono: true });
    if (card.build.length > 1) out.push({ text: `${prs.length} of ${card.build.length} PRs`, tone: 'outline', mono: true });
  }
  if (card.pilot) out.push({ text: `Pilot ${card.pilot}`, tone: 'quiet', mono: true });
  if (card.pilotMismatch) out.push({ text: 'Pilot mismatch', tone: 'fail' });
  if (card.stage === 'Verify' && card.qa && !card.qa.failed) out.push({ text: `${card.qa.passed} passed`, tone: 'pass' });
  return out;
}
