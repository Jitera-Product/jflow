import type { BoardCard } from '@/api/types';

export const prsToReviewOf = (card: BoardCard) => card.build.filter((r) => r.status === 'in review').length;
