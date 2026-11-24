import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';

const remote = new Map<string, JWTVerifyGetKey>(); // one key set per team domain, kept for the process

export async function verifyAccess(
  jwt: string | undefined, opts: { teamDomain: string; aud: string; jwks?: JWTVerifyGetKey },
): Promise<string | null> {
  if (!jwt) return null;
  try {
    let keys = opts.jwks ?? remote.get(opts.teamDomain);
    if (!keys) {
      keys = createRemoteJWKSet(new URL(`https://${opts.teamDomain}/cdn-cgi/access/certs`));
      remote.set(opts.teamDomain, keys);
    }
    const { payload } = await jwtVerify(jwt, keys, {
      issuer: `https://${opts.teamDomain}`, audience: opts.aud, algorithms: ['RS256'], requiredClaims: ['exp'],
    });
    return typeof payload.email === 'string' && payload.email ? payload.email.toLowerCase() : null;
  } catch {
    return null;
  }
}
