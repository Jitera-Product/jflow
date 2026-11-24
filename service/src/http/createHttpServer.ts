import { createHmac } from 'node:crypto';
import http from 'node:http';
import type { Deps } from '../feature/types.js';
import { handle } from './routes/handle.js';
import { send } from './send.js';
import type { HttpContext, HttpOptions } from './types.js';

export function createHttpServer(deps: Deps, opts: HttpOptions = {}): http.Server {
  const ctx: HttpContext = {
    deps,
    opts,
    origin: new URL(deps.config.publicUrl).origin, // normalizes case and default ports
    csrfKey: createHmac('sha256', deps.config.gateSecret).update('jflow-csrf').digest(), // a key of its own, not the row key
  };

  return http.createServer((req, res) => {
    handle(ctx, req, res).catch((e: unknown) => {
      console.error(`jflow: ${e instanceof Error ? e.message : String(e)}`);
      if (res.headersSent) res.end();
      else send(res, 500, 'error');
    });
  });
}
