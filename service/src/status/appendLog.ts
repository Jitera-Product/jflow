import { lines } from './lines.js';
import { noBreaks } from './noBreaks.js';

export function appendLog(md: string, line: string): string {
  noBreaks(line);
  const kept = lines(md).filter((l) => !l.startsWith('- YYYY-MM-DD - <stage>'));
  return `${kept.join('\n').trimEnd()}\n- ${line}\n`;
}
