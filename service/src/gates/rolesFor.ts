import type { Role } from './types.js';

export function rolesFor(from: string, to: string): Role[] {
  if (from === 'flow:spec-review' && to === 'flow:tdr') return ['owner', 'engineer'];
  if (from === 'flow:tdr') return ['engineer'];
  return ['owner'];
}
