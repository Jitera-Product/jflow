import type { Role } from '../gates/types.js';
import type { StageName } from '../status/stages.js';
import type { BuildRow } from '../work/types.js';
import type { Waiting } from './types.js';

const BY_STAGE: Record<StageName, Waiting['kind'] | null> = {
  Intent: 'owner', Spec: 'agent', 'Spec review': 'owner', TDR: 'engineer', UI: 'owner',
  Plan: 'owner', Build: 'agent', Verify: 'owner', Done: null,
};

// Build waits for an engineer when every PR not merged yet is in review.
// Verify waits for the agent until it has recorded checks.
function kindOf(stage: StageName, build: BuildRow[], checked: boolean): Waiting['kind'] | null {
  const open = build.filter((r) => r.status !== 'merged');
  if (stage === 'Build' && open.length && open.every((r) => r.status === 'in review')) return 'engineer';
  if (stage === 'Verify' && !checked) return 'agent';
  return BY_STAGE[stage];
}

export function waitsFor(
  missing: Role[] | null, stage: StageName, lead: { name: string } | null, engineers: string[],
  build: BuildRow[] = [], checked = false,
): Waiting[] {
  const kind = kindOf(stage, build, checked);
  const kinds: Waiting['kind'][] = missing ?? (kind ? [kind] : []);
  return kinds.map((kind) => ({
    kind,
    names: kind === 'owner' ? [lead?.name ?? 'an owner']
      : kind === 'engineer' ? (engineers.length && engineers.length <= 2 ? engineers : ['an engineer'])
      : ['the agent'],
  }));
}
