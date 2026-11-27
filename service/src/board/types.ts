import type { FlowProject } from '../linear/types.js';
import type { Role } from '../gates/types.js';
import type { QaCheck } from '../qa/types.js';
import type { GateRow, StageName } from '../status/stages.js';
import type { BuildRow } from '../work/types.js';

export type LogLine = { date: string; what: string; stage: string; who: string; text: string };
export type StatusFile = { gates: GateRow[]; log: LogLine[]; stage: StageName | null; build: BuildRow[] };
export type Waiting = { kind: 'owner' | 'engineer' | 'agent'; names: string[] };
// from and to are Linear labels, like flow:spec-review
export type OpenGate = { id: string; from: string; to: string; opened: string; missing: Role[] };
export type Card = {
  key: string; slugId: string; id: string | null;
  name: string; url: string; team: string;
  owner: { name: string; email: string } | null;
  stage: StageName; days: number; since: string; waitsFor: Waiting[];
  stuck: boolean; waitingForMe: boolean; notStarted: boolean; behind: boolean;
  openGate: OpenGate | null;
  build: BuildRow[]; // the Build table; GitHub data only on Build and Verify
  pilot: string | null; // the one pilot all open PRs are on
  pilotMismatch: boolean; // open PRs on different pilots, or some on none

  qa: { passed: number; failed: number } | null; // null until 4-verification.md has checks
  agentActive: boolean; // a jflow tool call in the last 10 minutes
};
// what the card needs beyond the status file
export type CardData = { checks: QaCheck[]; active: boolean };
export type StageBoard = {
  columns: Array<{ stage: StageName; cards: Card[] }>;
  stuck: number; notice: string | null; at: string;
};
export type BoardData = {
  projects: FlowProject[]; files: Map<string, StatusFile | null>; ids: Map<string, string>;
  checks: Map<string, QaCheck[]>; // 4-verification.md by slugId, Verify only
  filesFailed: boolean; at: string;
};
export type StageRow = { stage: StageName; status: string; date: string; file: string; by: string };
export type FeaturePanel = {
  card: Card; stages: StageRow[]; log: LogLine[];
  gate: { url: string; from: string; to: string; missing: Role[] } | null;
  files: string[]; linearUrl: string; behind: boolean;
  folder: string | null; chatUrl: string | null; notice: string | null;
  checks: QaCheck[];
};
