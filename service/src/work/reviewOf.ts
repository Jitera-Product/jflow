import type { GithubPr } from './types.js';

// The latest approve or request-changes of each reviewer counts; a dismissed review drops it.
export function reviewOf(reviews: Array<{ user: { login: string } | null; state: string }>): GithubPr['review'] {
  const latest = new Map<string, string>();
  for (const r of reviews) {
    const who = r.user?.login ?? '';
    if (r.state === 'APPROVED' || r.state === 'CHANGES_REQUESTED') latest.set(who, r.state);
    else if (r.state === 'DISMISSED') latest.delete(who);
  }
  const states = [...latest.values()];
  return states.includes('CHANGES_REQUESTED') ? 'changes requested' : states.includes('APPROVED') ? 'approved' : null;
}
