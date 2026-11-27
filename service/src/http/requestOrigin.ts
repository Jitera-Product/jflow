import type { IncomingMessage } from 'node:http';
import type { TLSSocket } from 'node:tls';
import { bareOrigin } from '../settings/bareOrigin.js';
import { header } from './header.js';

// null when the headers do not make a bare origin
export function requestOrigin(req: IncomingMessage): string | null {
  const first = (name: string) => header(req, name)?.split(',')[0]?.trim();
  const proto = first('x-forwarded-proto') || ((req.socket as TLSSocket).encrypted ? 'https' : 'http');
  const host = first('x-forwarded-host') || header(req, 'host');
  return host ? bareOrigin(`${proto}://${host}`) : null;
}
