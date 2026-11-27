import type { BuildRow } from '@/api/types';
import type { PillTone } from './Pill';

const BY_STATUS: Record<string, [PillTone, string]> = {
  merged: ['pass', 'Merged'],
  'in review': ['quiet', 'In review'],
  building: ['working', 'Building'],
  'waiting for answer': ['waits', 'Waits for answer'],
  waiting: ['quiet', 'Waiting'],
};

export function workChipOf(row: BuildRow): { tone: PillTone; text: string } | null {
  const g = row.github;
  if (g) {
    if (g.state === 'merged') return { tone: 'pass', text: 'Merged' };
    if (g.state === 'closed') return { tone: 'quiet', text: 'Closed' };
    if (g.state === 'draft') return { tone: 'quiet', text: 'Draft' };
    if (g.checks === 'failing') return { tone: 'fail', text: 'Checks failing' };
    if (g.review === 'changes requested') return { tone: 'waits', text: 'Changes requested' };
    if (g.review === 'approved') return { tone: 'pass', text: 'Approved' };
    return { tone: 'quiet', text: 'In review' };
  }
  const known = BY_STATUS[row.status];
  if (known) return { tone: known[0], text: known[1] };
  return row.status ? { tone: 'quiet', text: row.status.charAt(0).toUpperCase() + row.status.slice(1) } : null;
}
