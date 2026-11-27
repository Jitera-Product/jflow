import type { ReviewPr } from '@/api/types';
import { wholeDays } from '@/lib/wholeDays';
import type { WaitingRow } from './waitingRowsOf';

export function prWaitingRow(pr: ReviewPr, at: string): WaitingRow {
  const repo = pr.repo.split('/').pop()!;
  const link = { href: pr.url, text: 'Open PR', label: `Open PR ${pr.title}`, primary: false };
  const row = { group: 'Review code' as const, key: pr.url, days: wholeDays(pr.updatedAt, at), link };
  return pr.feature
    ? { ...row, id: pr.feature.key, name: pr.feature.name, what: pr.title, ref: `${repo} #${pr.number}` }
    : { ...row, id: repo, name: pr.title, what: `by @${pr.author}`, ref: `#${pr.number}` };
}
