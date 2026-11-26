import type { ServerResponse } from 'node:http';
import { loadFeaturePanel } from '../../board/loadFeaturePanel.js';
import { json } from '../json.js';
import type { HttpContext } from '../types.js';

export async function apiFeaturePanel(ctx: HttpContext, res: ServerResponse, email: string, key: string) {
  let panel;
  try {
    panel = await loadFeaturePanel(ctx.deps, ctx.opts.fetch ?? fetch, key, email);
  } catch {
    return json(res, 502, { error: 'unavailable', message: 'Linear or Jitera did not answer. Try again.' });
  }
  if (!panel) return json(res, 404, { error: 'not_found', message: `No flow project "${key}" in the jflow teams.` });
  json(res, 200, panel);
}
