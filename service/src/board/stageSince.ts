import type { LogLine, StatusFile } from './types.js';

// Stages only go forward, so the newest move is the one into the current stage.
// A gate line names the stage it left ("Spec review approved"), so match the move, not the stage.
const isMove = (l: LogLine) => l.what.endsWith(' approved') || l.text.startsWith('stage set to') || l.text.startsWith('folder created');

export function stageSince(file: StatusFile | null, updatedAt: string): string {
  return (file?.log ?? []).filter(isMove).map((l) => l.date).sort().at(-1) ?? updatedAt;
}
