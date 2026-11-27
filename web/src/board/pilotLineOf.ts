import type { BuildRow } from '@/api/types';

// each repo with an open PR and its pilot, like "automation P5, boost not on a pilot"
export function pilotLineOf(build: BuildRow[]): string {
  const open = build.filter((r) => r.github && (r.github.state === 'open' || r.github.state === 'draft'));
  return [...new Set(open.map((r) => `${r.repo} ${r.github!.pilot ?? 'not on a pilot'}`))].join(', ');
}
