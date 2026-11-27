import { shortDate } from './shortDate';
import { wholeDays } from './wholeDays';

export const ago = (iso: string, now: Date = new Date()): string => {
  const n = wholeDays(iso, now.toISOString());
  return n === 0 ? 'today' : n === 1 ? 'yesterday' : n < 30 ? `${n} days ago` : shortDate(iso);
};
