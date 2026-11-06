import type { Board } from '../shared/model.js';

export type Option = { id: string; name: string };
export type Options = { teams: Option[]; statuses: Option[] };
export type BoardResponse = Board & { window: string; updatedAt: string };
export type Filters = { window: string; teams: string[]; statuses: string[] };
