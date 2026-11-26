import { fetchJson } from './fetchJson';
import type { StageBoard } from './types';

export function getBoard({ team, mine, refresh }: { team: string; mine: boolean; refresh: boolean }) {
  const q = new URLSearchParams();
  if (team) q.set('team', team);
  if (mine) q.set('mine', '1');
  if (refresh) q.set('refresh', '1');
  const s = q.toString();
  return fetchJson<StageBoard>(s ? `/api/board?${s}` : '/api/board');
}
