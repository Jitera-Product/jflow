import type { FetchOptions } from './types.js';

export const projectFilter = (o: FetchOptions): Record<string, unknown> => ({
  status: o.statuses.length ? { id: { in: o.statuses } } : { type: { nin: ['completed', 'canceled'] } },
  ...(o.teams.length ? { accessibleTeams: { some: { id: { in: o.teams } } } } : {}),
});
