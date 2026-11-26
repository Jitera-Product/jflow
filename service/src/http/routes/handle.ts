import type { IncomingMessage, ServerResponse } from 'node:http';
import { header } from '../header.js';
import { json } from '../json.js';
import { send } from '../send.js';
import type { HttpContext } from '../types.js';
import { verifyAccess } from '../verifyAccess.js';
import { apiGate } from './apiGate.js';
import { apiSettings } from './apiSettings.js';
import { mcp } from './mcp.js';
import { staticFiles } from './staticFiles.js';
import { webhook } from './webhook.js';

export async function handle(ctx: HttpContext, req: IncomingMessage, res: ServerResponse) {
  const path = new URL(req.url ?? '/', 'http://localhost').pathname;
  if (path === '/healthz' && req.method === 'GET') return send(res, 200, 'ok');
  if (path === '/' && req.method === 'GET') return send(res, 302, '', { location: '/settings' });
  if (path === '/mcp') return req.method === 'POST' ? mcp(ctx.deps, req, res) : send(res, 405, 'method not allowed');
  if (path === '/webhooks/gate' && req.method === 'POST') return webhook(ctx.deps, req, res);

  const api = /^\/api\/(?:settings|gate\/([^/]+)\/([^/]+))$/.exec(path);
  if (api && (req.method === 'GET' || req.method === 'POST')) {
    if (req.method === 'POST') {
      const from = header(req, 'origin');
      const expected = ctx.origin() || from; // no publicUrl yet: the first save takes the page origin
      if (!from || from !== expected) return json(res, 403, { error: 'refused' });
    }
    const email = await verifyAccess(header(req, 'cf-access-jwt-assertion'), { ...ctx.deps.config.access, jwks: ctx.opts.jwks });
    if (!email) return json(res, 401, { error: 'sign_in' });
    return api[1] ? apiGate(ctx, req, res, email, api[1], api[2]!) : apiSettings(ctx, req, res, email);
  }
  if (path.startsWith('/api/')) return json(res, 404, { error: 'not_found', message: 'No such API.' });

  if (req.method === 'GET' && (path === '/settings' || /^\/gate\/[^/]+\/[^/]+$/.test(path) || path.startsWith('/assets/'))) {
    return staticFiles(ctx.deps.config.webDir, res, path);
  }
  send(res, 404, 'not found');
}
