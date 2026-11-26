import type { ServerResponse } from 'node:http';
import { checkLinear } from '../../linear/checkLinear.js';
import { json } from '../json.js';
import type { HttpContext } from '../types.js';

type Step = { ok: boolean; message?: string };

async function linearStep(ctx: HttpContext): Promise<Step> {
  const { linearApiKey, teams } = ctx.deps.settings.get();
  if (!linearApiKey) return { ok: false, message: 'Add a Linear API key.' };
  try {
    await checkLinear(ctx.opts.fetch ?? fetch, linearApiKey);
  } catch {
    return { ok: false, message: 'Linear did not accept the API key.' };
  }
  return teams.length ? { ok: true } : { ok: false, message: 'Pick at least one Linear team.' };
}

async function jiteraStep(ctx: HttpContext): Promise<Step> {
  try {
    await ctx.deps.docs.list(ctx.deps.config.flowFolder);
    return { ok: true };
  } catch {
    return { ok: false, message: 'Could not read the Jitera documents. Check the URL, project and token.' };
  }
}

export async function apiSetup(ctx: HttpContext, res: ServerResponse) {
  const [linear, jitera] = await Promise.all([linearStep(ctx), jiteraStep(ctx)]);
  json(res, 200, { linear, jitera, chats: { ok: ctx.deps.chats.list().some((c) => c.lastUsedAt) } });
}
