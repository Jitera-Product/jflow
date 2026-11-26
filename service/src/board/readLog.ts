import { STAGES } from '../status/stages.js';
import type { LogLine } from './types.js';

const DATED = /^- \d{4}-\d{2}-\d{2} - /;

export function readLog(ls: string[]): LogLine[] {
  return ls.filter((l) => DATED.test(l)).map((l) => {
    const [date = '', what = '', who = '', ...text] = l.slice(2).split(' - ');
    const stage = STAGES.filter((s) => what.startsWith(s)).sort((a, b) => b.length - a.length)[0] ?? '';
    return { date, stage, who, text: text.join(' - ') };
  });
}
