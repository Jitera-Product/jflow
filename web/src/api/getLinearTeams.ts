import { fetchJson } from './fetchJson';
import type { LinearTeam } from './types';

export const getLinearTeams = () => fetchJson<{ teams: LinearTeam[] }>('/api/linear/teams');
