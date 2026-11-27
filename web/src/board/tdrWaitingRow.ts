import type { ReviewTdr } from '@/api/types';
import type { WaitingRow } from './waitingRowsOf';

export const tdrWaitingRow = (tdr: ReviewTdr): WaitingRow => ({
  group: 'Review TDR', key: tdr.path, id: 'TDR', name: tdr.title, what: 'Read it, then tick your name under Reviewers.', ref: null, days: null,
  link: tdr.url ? { href: tdr.url, text: 'Open TDR', label: `Open TDR ${tdr.title}`, primary: false } : null,
});
