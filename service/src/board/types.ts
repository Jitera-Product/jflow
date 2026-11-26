import type { Role } from '../gates/types.js';
import type { GateRow, StageName } from '../status/stages.js';

export type LogLine = { date: string; stage: string; who: string; text: string };
export type StatusFile = { gates: GateRow[]; log: LogLine[]; stage: StageName | null };
export type Waiting = { kind: 'owner' | 'engineer' | 'agent'; names: string[] };
export type Card = {
  key: string; slugId: string; id: string | null;
  name: string; url: string; team: string;
  owner: { name: string; email: string } | null;
  stage: StageName; days: number; waitsFor: Waiting[];
  stuck: boolean; waitingForMe: boolean; notStarted: boolean; behind: boolean;
  openGate: { id: string; to: string; opened: string; missing: Role[] } | null;
};
export type StageBoard = {
  columns: Array<{ stage: StageName; cards: Card[] }>;
  stuck: number; notice: string | null; at: string;
};
