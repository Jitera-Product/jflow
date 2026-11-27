import type { IncomingMessage, ServerResponse } from 'node:http';
import { z } from 'zod';
import { sealSecret } from '../../settings/sealSecret.js';
import { githubGet } from '../../work/githubGet.js';
import { json } from '../json.js';
import { readJson } from '../readJson.js';
import { send } from '../send.js';
import type { HttpContext } from '../types.js';

const body = z.object({ token: z.string().trim().min(1).max(500) });

export async function apiMeGithub(ctx: HttpContext, req: IncomingMessage, res: ServerResponse, email: string) {
  const { personal, config, now } = ctx.deps;
  if (req.method === 'DELETE') {
    await personal.forgetGithub(email);
    return send(res, 204, '');
  }
  const read = await readJson(req, res);
  if (!read) return;
  const parsed = body.safeParse(read.body);
  if (!parsed.success) return json(res, 400, { error: 'invalid', message: 'Enter your GitHub token.' });
  const { token } = parsed.data;
  let login: string;
  try {
    login = (await githubGet<{ login: string }>(ctx.opts.fetch ?? fetch, token, '/user')).login;
  } catch {
    return json(res, 400, { error: 'github', message: 'GitHub did not accept this token.' });
  }
  await personal.saveGithub(email, { token: sealSecret(config.settingsKey, token), login }, now());
  console.log(`jflow: ${email} connected GitHub as ${login}`);
  json(res, 200, { login });
}
