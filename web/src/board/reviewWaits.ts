import type { BoardCard } from '@/api/types';

// Build waits for an engineer to review, not for a gate
export const reviewWaits = (card: BoardCard) =>
  card.stage === 'Build' && !card.openGate && card.waitsFor.some((w) => w.kind === 'engineer');
