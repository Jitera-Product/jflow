import type { IncomingMessage, ServerResponse } from 'node:http';
import { z } from 'zod';
import { json } from '../json.js';
import { readJson } from '../readJson.js';
import type { HttpContext } from '../types.js';
import { githubStep } from './githubStep.js';

const body = z.object({ githubToken: z.string().trim().optional() });

export async function apiTestGithub(ctx: HttpContext, req: IncomingMessage, res: ServerResponse) {
  const read = await readJson(req, res);
  if (!read) return;
  const parsed = body.safeParse(read.body);
  if (!parsed.success) return json(res, 400, { error: 'invalid' });
  const token = parsed.data.githubToken || ctx.deps.settings.get().githubToken;
  if (!token) return json(res, 200, { ok: false, message: 'Enter the GitHub token.' });
  json(res, 200, await githubStep(ctx, token));
}
