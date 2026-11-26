import type { LogLine, StatusFile } from './types.js';
import { wholeDaysSince } from './wholeDaysSince.js';

// Stages only go forward, so the newest move is the one into the current stage.
// A gate line names the stage it left ("Spec review approved"), so match the move, not the stage.
const isMove = (l: LogLine) => l.what.endsWith(' approved') || l.text.startsWith('stage set to') || l.text.startsWith('folder created');

export function daysInStage(file: StatusFile | null, updatedAt: string, now: Date): number {
  const moves = (file?.log ?? []).filter(isMove).map((l) => l.date).sort();
  return wholeDaysSince(moves.at(-1) ?? updatedAt, now);
}
