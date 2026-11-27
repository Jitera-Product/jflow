import { checkGithub } from '../../work/checkGithub.js';
import type { HttpContext } from '../types.js';
import type { SetupStep } from './SetupStep.js';

export const NO_GITHUB = 'Optional. Add a read-only GitHub token to show PR reviews, checks and pilots.';

export async function githubStep(ctx: HttpContext, token = ctx.deps.settings.get().githubToken): Promise<SetupStep> {
  if (!token) return { ok: false, message: NO_GITHUB };
  try {
    await checkGithub(ctx.opts.fetch ?? fetch, token);
    return { ok: true };
  } catch {
    return { ok: false, message: 'GitHub did not accept the token.' };
  }
}
