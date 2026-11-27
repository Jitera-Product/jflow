import { checksOf } from './checksOf.js';
import { githubGet } from './githubGet.js';
import { pilotOfLabels } from './pilotOfLabels.js';
import { prRefOf } from './prRefOf.js';
import { reviewOf } from './reviewOf.js';
import type { GithubPr } from './types.js';

type Pull = { state: string; draft: boolean; merged: boolean; labels: Array<{ name: string }>; head: { sha: string } };
type Review = { user: { login: string } | null; state: string };
type Runs = { check_runs: Array<{ status: string; conclusion: string | null }> };

export async function readGithubPr(fetchFn: typeof fetch, token: string, url: string): Promise<GithubPr | null> {
  const ref = prRefOf(url);
  if (!ref) return null;
  const at = `/repos/${ref.org}/${ref.repo}`;
  const pull = await githubGet<Pull>(fetchFn, token, `${at}/pulls/${ref.number}`);
  const pilot = pilotOfLabels(pull.labels);
  if (pull.merged) return { state: 'merged', review: null, checks: null, pilot };
  if (pull.state === 'closed') return { state: 'closed', review: null, checks: null, pilot };
  const [reviews, runs] = await Promise.all([
    githubGet<Review[]>(fetchFn, token, `${at}/pulls/${ref.number}/reviews?per_page=100`),
    // a token without the Checks permission still shows the rest
    githubGet<Runs>(fetchFn, token, `${at}/commits/${pull.head.sha}/check-runs?per_page=100`).catch(() => null),
  ]);
  return { state: pull.draft ? 'draft' : 'open', review: reviewOf(reviews), checks: runs && checksOf(runs.check_runs), pilot };
}
