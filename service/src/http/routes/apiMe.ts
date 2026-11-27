import type { ServerResponse } from 'node:http';
import { json } from '../json.js';
import type { HttpContext } from '../types.js';

export async function apiMe(ctx: HttpContext, res: ServerResponse, email: string) {
  const { engineers, teams } = ctx.deps.settings.get();
  const github = await ctx.deps.personal.github(email);
  json(res, 200, { email, engineer: engineers.includes(email), teams, github: github && { login: github.login } });
}
