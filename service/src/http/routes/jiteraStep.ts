import type { HttpContext } from '../types.js';
import type { SetupStep } from './SetupStep.js';

export async function jiteraStep(ctx: HttpContext): Promise<SetupStep> {
  try {
    await ctx.deps.docs.list(ctx.deps.config.flowFolder);
    return { ok: true };
  } catch {
    return { ok: false, message: 'Could not read the Jitera documents. Check the URL and the token.' };
  }
}
