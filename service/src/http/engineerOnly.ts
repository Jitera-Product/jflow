import type { ServerResponse } from 'node:http';
import { json } from './json.js';
import type { HttpContext } from './types.js';

// true when the caller is an engineer; otherwise it has already answered 403
export async function engineerOnly(ctx: HttpContext, res: ServerResponse, email: string): Promise<boolean> {
  const live = ctx.deps.settings;
  if (live.get().engineers.length === 0 && (await live.claimFirstEngineer(email))) {
    console.log(`jflow: ${email} is the first engineer`);
  }
  if (live.get().engineers.includes(email)) return true;
  json(res, 403, { error: 'not_allowed', message: 'Only jflow engineers can open settings. Ask an engineer to add you.' });
  return false;
}
