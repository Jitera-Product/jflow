import type { JWTVerifyGetKey } from 'jose';
import type { Deps } from '../feature/types.js';

export type HttpOptions = { jwks?: JWTVerifyGetKey };

export type HttpContext = {
  deps: Deps;
  opts: HttpOptions;
  origin: string; // publicUrl's origin, normalized
  csrfKey: Buffer;
};
