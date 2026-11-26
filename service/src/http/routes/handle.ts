import type { IncomingMessage, ServerResponse } from 'node:http';
import { engineerOnly } from '../engineerOnly.js';
import { header } from '../header.js';
import { json } from '../json.js';
import { sameOrigin } from '../sameOrigin.js';
import { send } from '../send.js';
import type { HttpContext } from '../types.js';
import { verifyAccess } from '../verifyAccess.js';
import { apiAgentPrompt } from './apiAgentPrompt.js';
import { apiChats } from './apiChats.js';
import { apiGate } from './apiGate.js';
import { apiLinear } from './apiLinear.js';
import { apiSettings } from './apiSettings.js';
import { apiSetup } from './apiSetup.js';
import { mcp } from './mcp.js';
import { staticFiles } from './staticFiles.js';
import { webhook } from './webhook.js';

export async function handle(ctx: HttpContext, req: IncomingMessage, res: ServerResponse) {
  const path = new URL(req.url ?? '/', 'http://localhost').pathname;
  if (path === '/healthz' && req.method === 'GET') return send(res, 200, 'ok');
  if (path === '/' && req.method === 'GET') return send(res, 302, '', { location: '/settings' });
  if (path === '/mcp') return req.method === 'POST' ? mcp(ctx.deps, req, res) : send(res, 405, 'method not allowed');
  if (path === '/webhooks/gate' && req.method === 'POST') return webhook(ctx.deps, req, res);

  const api = /^\/api\/(?:(settings|setup|agent-prompt|chats|linear\/(?:teams|labels))|chats\/([^/]+)|gate\/([^/]+)\/([^/]+))$/.exec(path);
  if (api && ['GET', 'POST', 'DELETE'].includes(req.method ?? '')) {
    const [, fixed, chatId, project, gate] = api;
    const m = req.method;
    const allowed = project ? m === 'GET' || m === 'POST'
      : chatId ? m === 'DELETE'
      : fixed === 'chats' ? m !== 'DELETE'
      : m === 'GET' || (m === 'POST' && fixed === 'settings');
    if (allowed) {
      if (m !== 'GET' && !sameOrigin(ctx, req)) return json(res, 403, { error: 'refused' });
      const email = await verifyAccess(header(req, 'cf-access-jwt-assertion'), { ...ctx.deps.config.access, jwks: ctx.opts.jwks });
      if (!email) return json(res, 401, { error: 'sign_in' });
      if (project) return apiGate(ctx, req, res, email, project, gate!);
      if (!(await engineerOnly(ctx, res, email))) return;
      if (fixed === 'settings') return apiSettings(ctx, req, res, email);
      if (fixed === 'setup') return apiSetup(ctx, res);
      if (fixed === 'agent-prompt') return apiAgentPrompt(ctx, res);
      if (fixed?.startsWith('linear/')) return apiLinear(ctx, res, fixed.slice(7));
      return apiChats(ctx, req, res, email, chatId);
    }
  }
  if (path.startsWith('/api/')) return json(res, 404, { error: 'not_found', message: 'No such API.' });

  if (req.method === 'GET' && (path === '/settings' || /^\/gate\/[^/]+\/[^/]+$/.test(path) || path.startsWith('/assets/'))) {
    return staticFiles(ctx.deps.config.webDir, res, path);
  }
  send(res, 404, 'not found');
}
