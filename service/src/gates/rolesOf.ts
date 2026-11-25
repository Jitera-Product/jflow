import type { Deps, Feature } from '../feature/types.js';
import type { Role } from './types.js';

export function rolesOf(deps: Deps, f: Feature, email: string): Role[] {
  const who = email.toLowerCase();
  const roles: Role[] = [];
  if (f.lead && f.lead.email.toLowerCase() === who) roles.push('owner');
  if (deps.settings.get().engineers.includes(who)) roles.push('engineer');
  return roles;
}
