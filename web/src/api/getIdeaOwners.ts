import { fetchJson } from './fetchJson';
import type { IdeaOwners } from './types';

export const getIdeaOwners = (team: string) => fetchJson<IdeaOwners>(`/api/ideas/owners?team=${encodeURIComponent(team)}`);
