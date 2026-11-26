import { FILTERS_STORE } from './filtersStore';
import type { Filters } from './types';

export function rememberFilters(f: Filters): void {
  const u = new URL(location.href);
  u.searchParams.set('window', f.window);
  for (const [k, v] of [['team', f.teams], ['status', f.statuses]] as const) {
    if (v.length) u.searchParams.set(k, v.join(','));
    else u.searchParams.delete(k);
  }
  // Keeps the router's own history state.
  history.replaceState(history.state, '', u);
  try {
    localStorage.setItem(FILTERS_STORE, JSON.stringify({ window: f.window, team: f.teams, status: f.statuses }));
  } catch {
    /* storage blocked: the link still keeps the choice */
  }
}
