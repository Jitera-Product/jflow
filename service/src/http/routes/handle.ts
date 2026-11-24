import type { IncomingMessage, ServerResponse } from 'node:http';
import { send } from '../send.js';
import type { HttpContext } from '../types.js';
import { confirm } from './confirm.js';
import { mcp } from './mcp.js';
import { webhook } from './webhook.js';

export async function handle(ctx: HttpContext, req: IncomingMessage, res: ServerResponse) {
  const path = new URL(req.url ?? '/', 'http://localhost').pathname;
  if (path === '/healthz' && req.method === 'GET') return send(res, 200, 'ok');
  if (path === '/mcp') return req.method === 'POST' ? mcp(ctx.deps, req, res) : send(res, 405, 'method not allowed');
  if (path === '/webhooks/gate' && req.method === 'POST') return webhook(ctx.deps, req, res);
  const m = /^\/gate\/([^/]+)\/([^/]+)$/.exec(path);
  if (m && (req.method === 'GET' || req.method === 'POST')) return confirm(ctx, req, res, m[1]!, m[2]!);
  send(res, 404, 'not found');
}
