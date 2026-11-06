import type { Filters } from './types.js';

const STORE = 'jflow-board-filters';
const DEFAULT_WINDOW = '-P30D';

const list = (v: string | null | undefined): string[] => (v ?? '').split(',').filter(Boolean);

export function initialFilters(): Filters {
  const url = new URLSearchParams(location.search);
  if (['window', 'team', 'status'].some((k) => url.has(k))) {
    return { window: url.get('window') ?? DEFAULT_WINDOW, teams: list(url.get('team')), statuses: list(url.get('status')) };
  }
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) ?? '{}') as { window?: string; team?: string[]; status?: string[] };
    return { window: saved.window ?? DEFAULT_WINDOW, teams: saved.team ?? [], statuses: saved.status ?? [] };
  } catch {
    return { window: DEFAULT_WINDOW, teams: [], statuses: [] };
  }
}

export function rememberFilters(f: Filters): void {
  const u = new URL(location.href);
  u.searchParams.set('window', f.window);
  for (const [k, v] of [['team', f.teams], ['status', f.statuses]] as const) {
    if (v.length) u.searchParams.set(k, v.join(','));
    else u.searchParams.delete(k);
  }
  history.replaceState(null, '', u);
  try {
    localStorage.setItem(STORE, JSON.stringify({ window: f.window, team: f.teams, status: f.statuses }));
  } catch {
    /* storage blocked: the link still keeps the choice */
  }
}
