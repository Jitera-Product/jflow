import type { LinearUser, Person } from './types.js';

export const toPerson = (u: LinearUser): Person => ({ id: u.id, name: u.displayName || u.name || u.email || u.id });
