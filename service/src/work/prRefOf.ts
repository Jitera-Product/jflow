const PULL = /^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/pull\/(\d+)(?:[/?#]|$)/;

export function prRefOf(url: string): { org: string; repo: string; number: number } | null {
  const m = PULL.exec(url);
  return m ? { org: m[1]!, repo: m[2]!, number: Number(m[3]) } : null;
}
