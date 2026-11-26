import type { ServerResponse } from 'node:http';
import { json } from '../json.js';
import type { HttpContext } from '../types.js';

export function apiMe(ctx: HttpContext, res: ServerResponse, email: string) {
  const { engineers, teams } = ctx.deps.settings.get();
  json(res, 200, { email, engineer: engineers.includes(email), teams });
}
