export function tdrNeeded(specMd: string): boolean {
  return specMd.split('\n').some((l) => /^\*\*TDR\.\*\*\s*"?needed\b/i.test(l));
}
