import type { SettingsInput } from './types.js';

export function checkSettings(input: SettingsInput, by: string): string[] {
  const problems: string[] = [];
  if (input.docsUrl !== '') {
    let ok = false;
    try {
      const u = new URL(input.docsUrl);
      ok = u.protocol === 'https:' || (u.protocol === 'http:' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1'));
    } catch {
      /* not a URL */
    }
    if (!ok) problems.push('docsUrl must be an https URL');
  }
  for (const k of input.teams) {
    if (!/^[A-Z][A-Z0-9]*$/.test(k)) problems.push(`team key "${k}" must be letters and digits, like CORE`);
  }
  for (const e of input.engineers) {
    if (!/^[^@\s]+@[^@\s]+$/.test(e)) problems.push(`"${e}" is not an email`);
  }
  if (input.engineers.length === 0) problems.push('keep at least one engineer');
  else if (!input.engineers.includes(by)) problems.push('you cannot remove yourself from engineers');
  return problems;
}
