import type { ServerResponse } from 'node:http';
import { listTeams } from '../../linear/listTeams.js';
import { missingFlowLabels } from '../../linear/missingFlowLabels.js';
import { json } from '../json.js';
import type { HttpContext } from '../types.js';

export async function apiLinear(ctx: HttpContext, res: ServerResponse, what: string) {
  const key = ctx.deps.settings.get().linearApiKey;
  if (!key) return json(res, 409, { error: 'no_key', message: 'Add a Linear API key first.' });
  const f = ctx.opts.fetch ?? fetch;
  try {
    if (what === 'teams') return json(res, 200, { teams: await listTeams(f, key) });
    json(res, 200, { missing: await missingFlowLabels(f, key) });
  } catch {
    json(res, 502, { error: 'linear', message: 'Linear did not answer. Check the key and try again.' });
  }
}
