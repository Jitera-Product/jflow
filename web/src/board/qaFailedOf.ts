import type { BoardCard } from '@/api/types';

export const qaFailedOf = (card: BoardCard) => (card.stage === 'Verify' && !card.openGate ? card.qa?.failed ?? 0 : 0);
