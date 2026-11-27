import type { IncomingMessage, ServerResponse } from 'node:http';
import { activeFeatures } from '../../activity/activeFeatures.js';
import { buildStageBoard } from '../../board/buildStageBoard.js';
import { loadStageBoard } from '../../board/loadStageBoard.js';
import { json } from '../json.js';
import type { HttpContext } from '../types.js';

export async function apiBoard(ctx: HttpContext, req: IncomingMessage, res: ServerResponse, email: string) {
  const q = new URL(req.url ?? '/', 'http://localhost').searchParams;
  const { teams: picked, engineers } = ctx.deps.settings.get();
  const asked = (q.get('team') ?? '').split(',').filter((t) => picked.includes(t));
  const teams = [...new Set(asked.length ? asked : picked)].sort();
  let data;
  try {
    data = await ctx.board(teams.join(','), q.get('refresh') === '1', () => loadStageBoard(ctx.deps, ctx.opts.fetch ?? fetch, teams));
  } catch {
    return json(res, 502, { error: 'linear', message: 'Linear did not answer. Check the key and try again.' });
  }
  // The cache holds the loaded data; mine and older only shape the board built from it, so they share one cache entry.
  const shape = { mine: q.get('mine') === '1', older: q.get('older') === '1' };
  const active = await activeFeatures(ctx.deps);
  json(res, 200, buildStageBoard({ ...data, active, engineers, viewer: email, ...shape }, new Date(data.at)));
}
