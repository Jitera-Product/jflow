import { loadStageBoard } from '../board/loadStageBoard.js';
import type { HttpContext } from '../http/types.js';
import { openSecret } from '../settings/openSecret.js';
import { featuresByPrUrl } from './featuresByPrUrl.js';
import { searchReviewPrs } from './searchReviewPrs.js';
import type { Reviews } from './types.js';

export async function reviewPrsOf(ctx: HttpContext, email: string): Promise<Pick<Reviews, 'github' | 'prs'>> {
  const fetchFn = ctx.opts.fetch ?? fetch;
  const saved = await ctx.deps.personal.github(email);
  const token = saved && openSecret(ctx.deps.config.settingsKey, saved.token);
  if (!saved || !token) return { github: 'none', prs: [] };
  let prs;
  try {
    prs = await ctx.board(`review-prs:${email}:${saved.login}`, false, () => searchReviewPrs(fetchFn, token));
  } catch (e) {
    console.warn(`jflow: reviews for ${email}: ${e instanceof Error ? e.message : String(e)}`);
    return { github: 'failed', prs: [] };
  }
  if (!prs.length) return { github: 'ok', prs };
  // the same cache entry as /api/board for all teams, so this rarely reads Linear or Jitera
  const teams = [...new Set(ctx.deps.settings.get().teams)].sort();
  const features = await ctx.board(teams.join(','), false, () => loadStageBoard(ctx.deps, fetchFn, teams))
    .then(featuresByPrUrl, () => new Map<string, { key: string; name: string }>());
  return { github: 'ok', prs: prs.map((p) => ({ ...p, feature: features.get(p.url.toLowerCase()) ?? null })) };
}
