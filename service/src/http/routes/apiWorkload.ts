import type { IncomingMessage, ServerResponse } from 'node:http';
import { buildBoard } from '../../workload/buildBoard.js';
import { DEFAULT_SETTINGS } from '../../workload/defaultSettings.js';
import { fetchBoardInput } from '../../workload/fetchBoardInput.js';
import { fetchFilterOptions } from '../../workload/fetchFilterOptions.js';
import { parseIds } from '../../workload/parseIds.js';
import { json } from '../json.js';
import type { HttpContext } from '../types.js';

const WINDOWS = new Set(['-P14D', '-P30D', '-P90D']);

export async function apiWorkload(ctx: HttpContext, req: IncomingMessage, res: ServerResponse, options: boolean) {
  const apiKey = ctx.deps.settings.get().linearApiKey;
  if (!apiKey) return json(res, 409, { error: 'not_configured', message: 'An engineer has to finish setup on /settings first.' });
  const fetchFn = ctx.opts.fetch ?? fetch;
  const q = new URL(req.url ?? '/', 'http://localhost').searchParams;
  const refresh = q.get('refresh') === '1';

  let load: () => Promise<unknown>;
  let key: string;
  if (options) {
    key = 'options';
    load = () => fetchFilterOptions(fetchFn, apiKey);
  } else {
    const window = q.get('window') ?? '-P30D';
    if (!WINDOWS.has(window)) return json(res, 400, { error: 'window must be one of -P14D, -P30D, -P90D' });
    const teams = parseIds(q.get('team'));
    const statuses = parseIds(q.get('status'));
    if (!teams || !statuses) return json(res, 400, { error: 'team and status must be comma-separated Linear ids' });
    key = `board/${teams.join(',')}/${statuses.join(',')}/${window}`;
    load = async () => {
      const input = await fetchBoardInput(fetchFn, { apiKey, teams, statuses, window, paceDays: DEFAULT_SETTINGS.paceDays });
      return { ...buildBoard(input, ctx.deps.now().getTime()), window, updatedAt: ctx.deps.now().toISOString() };
    };
  }

  try {
    json(res, 200, await ctx.workload(key, refresh, load));
  } catch {
    json(res, 502, { error: 'linear', message: 'Linear did not answer. Check the key and try again.' });
  }
}
