import type { IncomingMessage } from 'node:http';
import { header } from './header.js';
import { requestOrigin } from './requestOrigin.js';

export function sameOrigin(req: IncomingMessage): boolean {
  const from = header(req, 'origin');
  return !!from && from === requestOrigin(req);
}
