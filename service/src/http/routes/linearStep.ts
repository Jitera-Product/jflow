import { checkLinear } from '../../linear/checkLinear.js';
import type { HttpContext } from '../types.js';
import type { SetupStep } from './SetupStep.js';

export async function linearStep(ctx: HttpContext): Promise<SetupStep> {
  const { linearApiKey, teams } = ctx.deps.settings.get();
  if (!linearApiKey) return { ok: false, message: 'Add a Linear API key.' };
  try {
    await checkLinear(ctx.opts.fetch ?? fetch, linearApiKey);
  } catch {
    return { ok: false, message: 'Linear did not accept the API key.' };
  }
  return teams.length ? { ok: true } : { ok: false, message: 'Pick at least one Linear team.' };
}
