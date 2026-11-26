import http from 'node:http';
import { boardCache } from '../board/boardCache.js';
import type { Deps } from '../feature/types.js';
import { handle } from './routes/handle.js';
import { send } from './send.js';
import type { HttpContext, HttpOptions } from './types.js';

export function createHttpServer(deps: Deps, opts: HttpOptions = {}): http.Server {
  const ctx: HttpContext = {
    deps,
    opts,
    board: boardCache(60_000, deps.now),
    origin: () => {
      const { publicUrl } = deps.settings.get();
      return publicUrl ? new URL(publicUrl).origin : ''; // normalizes case and default ports
    },
  };

  return http.createServer((req, res) => {
    handle(ctx, req, res).catch((e: unknown) => {
      console.error(`jflow: ${e instanceof Error ? e.message : String(e)}`);
      if (res.headersSent) res.end();
      else send(res, 500, 'error');
    });
  });
}
