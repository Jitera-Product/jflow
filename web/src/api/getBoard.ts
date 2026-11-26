import { fetchJson } from './fetchJson';
import type { StageBoard } from './types';

type Query = { team: string; mine: boolean; older: boolean; refresh: boolean };

export function getBoard({ team, mine, older, refresh }: Query) {
  const q = new URLSearchParams();
  if (team) q.set('team', team);
  if (mine) q.set('mine', '1');
  if (older) q.set('older', '1');
  if (refresh) q.set('refresh', '1');
  const s = q.toString();
  return fetchJson<StageBoard>(s ? `/api/board?${s}` : '/api/board');
}
