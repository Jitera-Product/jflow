import { cellsOf } from './cellsOf.js';
import { lines } from './lines.js';
import { noBreaks } from './noBreaks.js';
import { rowOf } from './rowOf.js';
import { STAGES, type StageName, type StageStatus } from './stages.js';

const UI_FILE = '2-ui/README.md';

export function setStage(md: string, stage: StageName, status: StageStatus, date: string, by: string): string {
  noBreaks(date, by);
  const ls = lines(md);
  const at = (name: string) => ls.findIndex((l) => new RegExp(`^\\| \\d+ \\| ${name} \\|`).test(l));
  let i = at(stage);
  if (i < 0) {
    const tdr = at('TDR');
    if (stage !== 'UI' || tdr < 0) throw new Error(`No ${stage} row in the status file.`);
    ls.splice(tdr + 1, 0, `| 5 | UI | not started | ${UI_FILE} | | |`);
    for (const name of ['Plan', 'Build', 'Verify', 'Done'] as const) {
      const j = at(name);
      if (j >= 0) ls[j] = ls[j]!.replace(/^\| \d+ \|/, `| ${STAGES.indexOf(name) + 1} |`);
    }
    i = tdr + 1;
  }
  const c = cellsOf(ls[i]!);
  c[2] = status; c[4] = date; c[5] = by;
  ls[i] = rowOf(c);
  return ls.join('\n');
}
