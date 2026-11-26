import type { Role } from '../gates/types.js';
import type { StageName } from '../status/stages.js';
import type { Waiting } from './types.js';

const BY_STAGE: Record<StageName, Waiting['kind'] | null> = {
  Intent: 'owner', Spec: 'agent', 'Spec review': 'owner', TDR: 'engineer', UI: 'owner',
  Plan: 'owner', Build: 'agent', Verify: 'owner', Done: null,
};

export function waitsFor(
  missing: Role[] | null, stage: StageName, lead: { name: string } | null, engineers: string[],
): Waiting[] {
  const kinds: Waiting['kind'][] = missing ?? (BY_STAGE[stage] ? [BY_STAGE[stage]!] : []);
  return kinds.map((kind) => ({
    kind,
    names: kind === 'owner' ? [lead?.name ?? 'an owner']
      : kind === 'engineer' ? (engineers.length ? engineers : ['an engineer'])
      : ['the agent'],
  }));
}
