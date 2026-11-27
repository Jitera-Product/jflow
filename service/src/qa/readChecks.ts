import type { QaCheck } from './types.js';

const PASS = ['pass', 'passed', 'ok'];
const FAIL = ['fail', 'failed'];

// Rows of the 4-verification.md table: | Requirement | Check | Command or source | Result | Evidence |.
export function readChecks(md: string): QaCheck[] {
  return md.split('\n').map((l) => l.trim()).filter((l) => l.startsWith('|')).flatMap((l) => {
    const c = l.replace(/^\||\|$/g, '').split('|').map((s) => s.trim());
    const result = (c[3] ?? '').toLowerCase().replace(/[^a-z]/g, '');
    const passed = PASS.includes(result) ? true : FAIL.includes(result) ? false : null;
    if (passed === null) return [];
    return [{ check: c[1] || c[0] || '', passed, evidence: c[4] ?? '' }];
  });
}
