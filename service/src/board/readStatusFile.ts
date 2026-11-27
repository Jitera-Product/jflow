import { lines } from '../status/lines.js';
import { readGates } from '../status/readGates.js';
import { readLog } from './readLog.js';
import { readStage } from './readStage.js';
import { readBuildTable } from '../work/readBuildTable.js';
import type { StatusFile } from './types.js';

export function readStatusFile(md: string): StatusFile {
  const ls = lines(md);
  return { gates: readGates(md), log: readLog(ls), stage: readStage(ls), build: readBuildTable(ls) };
}
