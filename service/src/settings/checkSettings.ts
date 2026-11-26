import { bareOrigin } from './bareOrigin.js';
import { isChatLink } from './isChatLink.js';
import { isDocsUrl } from './isDocsUrl.js';
import type { SettingsInput } from './types.js';

export function checkSettings(input: SettingsInput, by: string): string[] {
  const problems: string[] = [];
  if (input.docsUrl !== '' && !isDocsUrl(input.docsUrl)) problems.push('docsUrl must be an https URL');
  if (input.publicUrl && bareOrigin(input.publicUrl) === null) {
    problems.push('publicUrl must be a bare origin like https://flow.example.com, with no path, query or hash');
  }
  if (input.flowAgentUrl && !isChatLink(input.flowAgentUrl)) {
    problems.push('flowAgentUrl must be the Studio chat address of the Flow agent, like https://studio.jitera.app/p/<project>/chat?a=<agent>');
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
