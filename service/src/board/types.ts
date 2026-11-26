import type { FlowProject } from '../linear/types.js';
import type { Role } from '../gates/types.js';
import type { GateRow, StageName } from '../status/stages.js';

export type LogLine = { date: string; what: string; stage: string; who: string; text: string };
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
export type BoardData = {
  projects: FlowProject[]; files: Map<string, StatusFile | null>; ids: Map<string, string>;
  filesFailed: boolean; at: string;
};
export type StageRow = { stage: StageName; status: string; date: string };
export type FeaturePanel = {
  card: Card; stages: StageRow[]; log: LogLine[];
  gate: { url: string; from: string; to: string; missing: Role[] } | null;
  files: string[]; linearUrl: string; behind: boolean;
  folder: string | null; notice: string | null;
};
