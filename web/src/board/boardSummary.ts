import type { BoardCard } from '@/api/types';

export function boardSummary(cards: BoardCard[]): string {
  const stuck = cards.filter((c) => c.stuck).length;
  const mine = cards.filter((c) => c.waitingForMe).length;
  return [
    `${cards.length} ${cards.length === 1 ? 'feature' : 'features'}`,
    stuck ? `${stuck} stuck` : '',
    mine ? `${mine} ${mine === 1 ? 'waits' : 'wait'} for you` : '',
  ].filter(Boolean).join(', ');
}
