import { readFile } from 'node:fs/promises';
import type { ServerResponse } from 'node:http';
import { send } from '../send.js';
import type { HttpContext } from '../types.js';

export async function apiAgentPrompt(ctx: HttpContext, res: ServerResponse) {
  send(res, 200, await readFile(ctx.deps.config.agentFile, 'utf8'), { 'content-type': 'text/markdown; charset=utf-8', 'cache-control': 'no-store' });
}
