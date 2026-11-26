import { jiteraReason } from '../jiteraReason.js';
import type { HttpContext } from '../types.js';
import type { SetupStep } from './SetupStep.js';

export async function jiteraStep(ctx: HttpContext): Promise<SetupStep> {
  try {
    await ctx.deps.docs.list(ctx.deps.config.flowFolder);
    return { ok: true };
  } catch (e) {
    return { ok: false, message: `Could not read the Jitera documents: ${jiteraReason(e, ctx.deps.settings.get().docsToken)}` };
  }
}
