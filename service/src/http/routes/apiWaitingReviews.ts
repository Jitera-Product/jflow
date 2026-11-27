import type { ServerResponse } from 'node:http';
import { findUserByEmail } from '../../linear/findUserByEmail.js';
import { loadTdrsInReview } from '../../reviews/loadTdrsInReview.js';
import { reviewPrsOf } from '../../reviews/reviewPrsOf.js';
import type { Reviews, TdrInReview } from '../../reviews/types.js';
import { json } from '../json.js';
import type { HttpContext } from '../types.js';

const warned = <T>(what: string, fallback: T) => (e: unknown) => {
  console.warn(`jflow: ${what}: ${e instanceof Error ? e.message : String(e)}`);
  return fallback;
};

export async function apiWaitingReviews(ctx: HttpContext, res: ServerResponse, email: string) {
  const fetchFn = ctx.opts.fetch ?? fetch;
  const { linearApiKey } = ctx.deps.settings.get();
  const [prs, user, tdrs] = await Promise.all([
    reviewPrsOf(ctx, email),
    ctx.board(`linear-user:${email}`, false, () => findUserByEmail(fetchFn, linearApiKey, email)).catch(warned(`Linear user ${email}`, null)),
    ctx.tdrs('tdrs', false, () => loadTdrsInReview(ctx.deps)).catch(warned('TDR folder', [] as TdrInReview[])),
  ]);
  const names = new Set([user?.name, user?.displayName].filter((n): n is string => !!n).map((n) => n.trim().toLowerCase()));
  const mine = tdrs.filter((t) => t.reviewers.some((r) => names.has(r.toLowerCase())));
  const body: Reviews = { ...prs, tdrs: mine.map(({ title, path, url }) => ({ title, path, url })) };
  json(res, 200, body);
}
