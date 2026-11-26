import type { BoardCard, StageBoard } from '@/api/types';

export const STAGES = ['Intent', 'Spec', 'Spec review', 'TDR', 'UI', 'Plan', 'Build', 'Verify', 'Done'];

export const card = (o: Partial<BoardCard> = {}): BoardCard => ({
  key: 'P-ENG-12', slugId: 'a1b2', id: 'P-ENG-12', name: 'Search filters', url: 'https://linear.app/x/project/a1b2',
  team: 'ENG', owner: { name: 'Mika', email: 'mika@example.com' }, stage: 'Spec review', days: 4,
  waitsFor: [{ kind: 'owner', names: ['Mika'] }], stuck: false, waitingForMe: false, notStarted: false, behind: false, openGate: null,
  ...o,
});

export const board = (cards: BoardCard[], o: Partial<StageBoard> = {}): StageBoard => ({
  columns: STAGES.map((stage) => ({ stage, cards: cards.filter((c) => c.stage === stage) })),
  stuck: cards.filter((c) => c.stuck).length, notice: null, at: '2026-11-26T10:00:00.000Z',
  ...o,
});

export const me = (o: { engineer?: boolean } = {}) => ({ email: 'mika@example.com', engineer: false, teams: ['ENG', 'CORE'], ...o });
