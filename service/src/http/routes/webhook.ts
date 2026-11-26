import type { IncomingMessage, ServerResponse } from 'node:http';
import { z } from 'zod';
import type { Deps } from '../../feature/types.js';
import { decideGate } from '../../gates/decideGate.js';
import { header } from '../header.js';
import { hmac } from '../hmac.js';
import { json } from '../json.js';
import { known } from '../known.js';
import { readBody } from '../readBody.js';
import { same } from '../same.js';
import { tooLarge } from '../tooLarge.js';

const MAX_SKEW_SECONDS = 300;

const hookBody = z.object({
  gate: z.string().min(1), project: z.string().min(1), decision: z.enum(['approve', 'changes']),
  email: z.string().min(1),
  source: z.string().min(1).regex(/^[^|\r\n]+$/), // goes into a log line
  to: z.string().regex(/^flow:[a-z-]+$/), // the move the person saw on the card
});

export async function webhook(deps: Deps, req: IncomingMessage, res: ServerResponse) {
  const raw = await readBody(req);
  if (!raw) return tooLarge(res);
  const ts = header(req, 'x-jflow-timestamp') ?? '';
  const got = header(req, 'x-jflow-signature') ?? '';
  const signed = deps.chats.tokens().some((t) => same(got, `sha256=${hmac(t, `${ts}.`, raw)}`));
  const fresh = /^\d+$/.test(ts) && Math.abs(deps.now().getTime() / 1000 - Number(ts)) <= MAX_SKEW_SECONDS;
  if (!fresh || !signed) return json(res, 401, { error: 'unauthorized' });
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.toString('utf8'));
  } catch {
    return json(res, 400, { error: 'invalid_body' });
  }
  const body = hookBody.safeParse(parsed);
  if (!body.success) return json(res, 400, { error: 'invalid_body' });
  const { project, gate, email, decision, source, to } = body.data;
  let decided;
  try {
    decided = await decideGate(deps, { project, gate, email, decision, channel: source, expectedTo: to });
  } catch (e) {
    if (!known(e)) throw e;
    return json(res, e.code === 'not_found' ? 404 : 409, { error: e.code });
  }
  json(res, 200, decided);
}
