import type { ServerResponse } from 'node:http';
import { json } from '../json.js';
import type { HttpContext } from '../types.js';
import { jiteraStep } from './jiteraStep.js';
import { linearStep } from './linearStep.js';

export async function apiSetup(ctx: HttpContext, res: ServerResponse) {
  const [linear, jitera] = await Promise.all([linearStep(ctx), jiteraStep(ctx)]);
  json(res, 200, { linear, jitera, chats: { ok: ctx.deps.chats.list().some((c) => c.lastUsedAt) } });
}
