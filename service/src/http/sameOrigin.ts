import type { IncomingMessage } from 'node:http';
import { header } from './header.js';
import type { HttpContext } from './types.js';

export function sameOrigin(ctx: HttpContext, req: IncomingMessage): boolean {
  const from = header(req, 'origin');
  const expected = ctx.origin() || from; // no publicUrl yet: the first save takes the page origin
  return !!from && from === expected;
}
