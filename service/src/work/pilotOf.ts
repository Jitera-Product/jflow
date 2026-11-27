import type { BuildRow } from './types.js';

// One feature, one pilot: every open PR of the feature has to carry the same pilot label.
// No pilot on any open PR is no pilot; a mix, or PRs without one next to PRs with one, is a mismatch.
export function pilotOf(rows: BuildRow[]): { pilot: string | null; mismatch: boolean } {
  const open = rows.flatMap((r) => (r.github && (r.github.state === 'open' || r.github.state === 'draft') ? [r.github.pilot] : []));
  const pilots = new Set(open);
  if (!open.some(Boolean)) return { pilot: null, mismatch: false };
  return pilots.size === 1 ? { pilot: open[0]!, mismatch: false } : { pilot: null, mismatch: true };
}
