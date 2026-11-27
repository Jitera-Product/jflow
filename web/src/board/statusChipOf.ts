import type { BoardCard } from '@/api/types';
import { shortDate } from '@/lib/shortDate';
import { myActionOf } from './myActionOf';

export type StatusChip = { tone: 'you' | 'person' | 'agent' | 'done'; text: string };

export function statusChipOf(card: BoardCard): StatusChip | null {
  if (card.stage === 'Done') return { tone: 'done', text: `Done ${shortDate(card.since)}` };
  if (card.waitingForMe) return { tone: 'you', text: `You: ${myActionOf(card)}` };
  const people = card.waitsFor.filter((w) => w.kind !== 'agent').flatMap((w) => w.names);
  if (people.length) {
    const text = people.join(', ');
    return { tone: 'person', text: text.startsWith('an owner') ? `Needs ${text}` : text };
  }
  return card.waitsFor.length ? { tone: 'agent', text: 'Agent' } : null;
}
