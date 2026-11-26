import type { JWTVerifyGetKey } from 'jose';
import type { mcpDocuments } from '../documents/mcpDocuments.js';
import type { Deps } from '../feature/types.js';

export type HttpOptions = { jwks?: JWTVerifyGetKey; fetch?: typeof fetch; makeDocs?: typeof mcpDocuments };

export type HttpContext = {
  deps: Deps;
  opts: HttpOptions;
  origin: () => string; // origin of the current publicUrl, '' until it is set
};
