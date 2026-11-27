import type { BoardCard } from '@/api/types';
import { plural } from '@/lib/plural';
import { shortDate } from '@/lib/shortDate';
import { myActionOf } from './myActionOf';
import { prsToReviewOf } from './prsToReviewOf';
import { qaFailedOf } from './qaFailedOf';
import { reviewWaits } from './reviewWaits';

export type StatusChip = { tone: 'you' | 'person' | 'agent' | 'working' | 'done'; text: string };

const WORKING: Record<string, string> = { Build: 'Agent building', Verify: 'Agent checking' };

export function statusChipOf(card: BoardCard): StatusChip | null {
  if (card.stage === 'Done') return { tone: 'done', text: `Done ${shortDate(card.since)}` };
  if (card.waitingForMe) return { tone: 'you', text: `You: ${myActionOf(card)}` };
  const people = card.waitsFor.filter((w) => w.kind !== 'agent').flatMap((w) => w.names);
  if (people.length) {
    const failed = qaFailedOf(card);
    if (failed && card.owner) return { tone: 'person', text: `${card.owner.name.split(' ')[0]}: ${failed} failed` };
    if (reviewWaits(card)) return { tone: 'person', text: `Review ${plural(prsToReviewOf(card), 'PR')}` };
    const text = people.join(', ');
    return { tone: 'person', text: text.startsWith('an owner') ? `Needs ${text}` : text };
  }
  if (!card.waitsFor.length) return null;
  if (card.stage === 'Build' && !card.openGate) {
    if (card.build.some((r) => r.status === 'building')) return { tone: 'working', text: 'Agent building' };
    if (card.build.some((r) => r.status === 'waiting for answer')) return { tone: 'person', text: 'Waits for an answer' };
  }
  return card.agentActive ? { tone: 'working', text: WORKING[card.stage] ?? 'Agent working' } : { tone: 'agent', text: 'Agent' };
}
