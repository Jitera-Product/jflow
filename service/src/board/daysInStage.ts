import type { StageName } from '../status/stages.js';
import type { StatusFile } from './types.js';
import { wholeDaysSince } from './wholeDaysSince.js';

export function daysInStage(file: StatusFile | null, stage: StageName, updatedAt: string, now: Date): number {
  const dates = (file?.log ?? []).filter((l) => l.stage === stage).map((l) => l.date).sort();
  return wholeDaysSince(dates.at(-1) ?? updatedAt, now);
}
