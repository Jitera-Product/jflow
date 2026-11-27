import type { JWTVerifyGetKey } from 'jose';
import type { BoardCache } from '../board/boardCache.js';
import type { mcpDocuments } from '../documents/mcpDocuments.js';
import type { Deps } from '../feature/types.js';

export type HttpOptions = { jwks?: JWTVerifyGetKey; fetch?: typeof fetch; makeDocs?: typeof mcpDocuments };

export type HttpContext = {
  deps: Deps;
  opts: HttpOptions;
  board: BoardCache;
  workload: BoardCache; // 10 minute cache for the workload page
  tdrs: BoardCache;
};
