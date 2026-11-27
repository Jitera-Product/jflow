import type { GithubPr } from './types.js';

const FAILED = ['failure', 'timed_out', 'cancelled', 'action_required', 'startup_failure'];

export function checksOf(runs: Array<{ status: string; conclusion: string | null }>): GithubPr['checks'] {
  if (!runs.length) return null;
  if (runs.some((r) => r.conclusion && FAILED.includes(r.conclusion))) return 'failing';
  return runs.some((r) => r.status !== 'completed') ? 'running' : 'passing';
}
