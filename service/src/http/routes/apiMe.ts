import type { ServerResponse } from 'node:http';
import { json } from '../json.js';
import type { HttpContext } from '../types.js';

export const apiMe = (ctx: HttpContext, res: ServerResponse, email: string) =>
  json(res, 200, { email, engineer: ctx.deps.settings.get().engineers.includes(email) });
