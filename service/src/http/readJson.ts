import type { IncomingMessage, ServerResponse } from 'node:http';
import { header } from './header.js';
import { json } from './json.js';
import { readBody } from './readBody.js';

export async function readJson(req: IncomingMessage, res: ServerResponse): Promise<{ body: unknown } | null> {
  if ((header(req, 'content-type') ?? '').split(';')[0]!.trim().toLowerCase() !== 'application/json') {
    json(res, 415, { error: 'json_only' });
    return null;
  }
  const raw = await readBody(req);
  if (!raw) {
    res.setHeader('connection', 'close');
    json(res, 413, { error: 'too_large' });
    return null;
  }
  try {
    return { body: JSON.parse(raw.toString('utf8')) };
  } catch {
    return { body: undefined };
  }
}
