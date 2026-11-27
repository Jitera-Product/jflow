import type { BoardCard } from '@/api/types';

// failed QA checks the owner has to decide on; 0 when there are none or a gate is open
export const qaFailedOf = (card: BoardCard) => (card.stage === 'Verify' && !card.openGate ? card.qa?.failed ?? 0 : 0);
