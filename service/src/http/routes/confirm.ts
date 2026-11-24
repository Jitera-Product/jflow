import type { IncomingMessage, ServerResponse } from 'node:http';
import { decideGate } from '../../gates/decideGate.js';
import { GateError } from '../../gates/GateError.js';
import { messagePage } from '../../page/messagePage.js';
import { csrfOf } from '../csrfOf.js';
import { header } from '../header.js';
import { known } from '../known.js';
import { readBody } from '../readBody.js';
import { same } from '../same.js';
import { send } from '../send.js';
import { tooLarge } from '../tooLarge.js';
import type { HttpContext } from '../types.js';
import { verifyAccess } from '../verifyAccess.js';
import { gateView } from './gateView.js';

const HTML_HEADERS = {
  'content-type': 'text/html; charset=utf-8',
  'cache-control': 'no-store',
  'x-frame-options': 'DENY',
  'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'",
};
const html = (res: ServerResponse, status: number, body: string) => send(res, status, body, HTML_HEADERS);

export async function confirm(ctx: HttpContext, req: IncomingMessage, res: ServerResponse, project: string, gate: string) {
  const { deps } = ctx;
  const { config } = deps;
  if (req.method === 'POST' && header(req, 'origin') !== ctx.origin) {
    return html(res, 403, messagePage('Refused', 'This request did not come from the confirm page.'));
  }
  const email = await verifyAccess(header(req, 'cf-access-jwt-assertion'), { ...config.access, jwks: ctx.opts.jwks });
  if (!email) return html(res, 401, messagePage('Sign in', 'Open this page through Cloudflare Access.'));
  try {
    if (req.method === 'GET') return html(res, 200, await gateView(ctx, project, gate, email));
    const raw = await readBody(req);
    if (!raw) return tooLarge(res);
    const form = new URLSearchParams(raw.toString('utf8'));
    const decision = form.get('decision');
    if ((decision !== 'approve' && decision !== 'changes') || !same(form.get('csrf') ?? '', csrfOf(ctx.csrfKey, gate, email))) {
      return html(res, 403, messagePage('Refused', 'This form is not valid. Open the page again.'));
    }
    try {
      await decideGate(deps, { project, gate, email, decision, channel: 'page', expectedTo: form.get('to') ?? '' });
    } catch (e) {
      if (e instanceof GateError && e.code !== 'not_found') return html(res, 409, await gateView(ctx, project, gate, email, `${e.code}: ${e.message}`));
      throw e;
    }
    res.writeHead(303, { location: `${config.publicUrl}/gate/${project}/${gate}` }).end();
  } catch (e) {
    if (!known(e)) throw e;
    if (e.code === 'not_found') return html(res, 404, messagePage('Not found', e.message));
    return html(res, 409, messagePage(`Refused: ${e.code}`, e.message));
  }
}
