import type { BoardCard, StageBoard } from '@/api/types';
import { PHASES } from './PHASES';

export function phaseColumnsOf(columns: StageBoard['columns']): Array<{ name: string; hint: string; cards: BoardCard[] }> {
  return PHASES.map((p) => ({
    name: p.name,
    hint: p.hint,
    cards: p.stages.flatMap((s) => columns.find((c) => c.stage === s)?.cards ?? []),
  }));
}
