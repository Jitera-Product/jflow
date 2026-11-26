import type { IncomingMessage, ServerResponse } from 'node:http';
import { z } from 'zod';
import { ChatTokenError } from '../../chats/ChatTokenError.js';
import { json } from '../json.js';
import { readJson } from '../readJson.js';
import { send } from '../send.js';
import type { HttpContext } from '../types.js';

const body = z.object({ name: z.string().trim().min(1).max(64) });

export async function apiChats(ctx: HttpContext, req: IncomingMessage, res: ServerResponse, email: string, id: string | undefined) {
  const chats = ctx.deps.chats;
  if (req.method === 'GET') return json(res, 200, { chats: chats.list() });
  if (req.method === 'DELETE') {
    if (!id || !(await chats.revoke(id))) return json(res, 404, { error: 'not_found' });
    console.log(`jflow: chat ${id} revoked by ${email}`);
    return send(res, 204, '');
  }
  if (id) return json(res, 404, { error: 'not_found' });
  if (!ctx.origin()) return json(res, 409, { error: 'no_public_url', message: 'Set the public URL first.' });
  const read = await readJson(req, res);
  if (!read) return;
  const parsed = body.safeParse(read.body);
  if (!parsed.success) return json(res, 400, { error: 'invalid', problems: ['name: a name is required'] });
  try {
    json(res, 200, await chats.create(parsed.data.name, email));
  } catch (e) {
    if (e instanceof ChatTokenError) return json(res, 409, { error: e.code, message: 'A chat with this name exists.' });
    throw e;
  }
}
