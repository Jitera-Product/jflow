import type { BoardResponse, Filters } from '@/workload/types';
import { fetchJson } from './fetchJson';

export function getWorkload(f: Filters, refresh: boolean) {
  const q = new URLSearchParams({ window: f.window });
  if (f.teams.length) q.set('team', f.teams.join(','));
  if (f.statuses.length) q.set('status', f.statuses.join(','));
  if (refresh) q.set('refresh', '1');
  return fetchJson<BoardResponse>(`/api/workload?${q}`);
}
