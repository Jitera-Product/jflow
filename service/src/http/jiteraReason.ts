// Jitera's own words help the person fix the setup; the token must never come back with them.
export function jiteraReason(e: unknown, token: string): string {
  const raw = e instanceof Error ? e.message : String(e);
  const clean = (token ? raw.split(token).join('***') : raw).replace(/\s+/g, ' ').trim();
  return clean.length > 300 ? `${clean.slice(0, 300)}...` : clean;
}
