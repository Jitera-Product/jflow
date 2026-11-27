import type { BoardCard } from '@/api/types';

export const reviewWaits = (card: BoardCard) =>
  card.stage === 'Build' && !card.openGate && card.waitsFor.some((w) => w.kind === 'engineer');
