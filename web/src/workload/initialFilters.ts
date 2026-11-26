import { commaList } from './commaList';
import { FILTERS_STORE } from './filtersStore';
import type { Filters } from './types';

const DEFAULT_WINDOW = '-P30D';

export function initialFilters(): Filters {
  const url = new URLSearchParams(location.search);
  if (['window', 'team', 'status'].some((k) => url.has(k))) {
    return { window: url.get('window') ?? DEFAULT_WINDOW, teams: commaList(url.get('team')), statuses: commaList(url.get('status')) };
  }
  try {
    const saved = JSON.parse(localStorage.getItem(FILTERS_STORE) ?? '{}') as { window?: string; team?: string[]; status?: string[] };
    return { window: saved.window ?? DEFAULT_WINDOW, teams: saved.team ?? [], statuses: saved.status ?? [] };
  } catch {
    return { window: DEFAULT_WINDOW, teams: [], statuses: [] };
  }
}
