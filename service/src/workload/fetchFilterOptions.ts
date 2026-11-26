import { gql } from '../linear/gql.js';
import { OPTIONS_QUERY } from './queries.js';
import type { FilterOptions } from './types.js';

export async function fetchFilterOptions(fetchFn: typeof fetch, apiKey: string): Promise<FilterOptions> {
  const d = await gql<{
    teams: { nodes: Array<{ id: string; name: string; key: string }> };
    projectStatuses: { nodes: Array<{ id: string; name: string; type: string; position: number }> };
  }>(fetchFn, apiKey, OPTIONS_QUERY, {});
  return {
    teams: [...d.teams.nodes].sort((x, y) => x.name.localeCompare(y.name)),
    statuses: [...d.projectStatuses.nodes].sort((x, y) => x.position - y.position).map(({ id, name, type }) => ({ id, name, type })),
  };
}
