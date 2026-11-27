export type SettingsView = {
  email: string;
  settings: {
    docsUrl: string;
      docsTokenSet: boolean;
    linearApiKeySet: boolean;
    githubTokenSet: boolean;
    teams: string[];
    engineers: string[];
    tdrFolder: string;
    flowAgentUrl: string;
    updatedBy: string | null;
    updatedAt: string | null;
  };
};

export type SettingsInput = {
  docsUrl: string;
  teams: string[];
  engineers: string[];
  tdrFolder: string;
  flowAgentUrl: string;
  docsToken?: string;
  linearApiKey?: string;
  githubToken?: string;
};

export type SetupStep = { ok: boolean; message?: string };

export type SetupView = { linear: SetupStep; jitera: SetupStep; github: SetupStep; chats: { ok: boolean } };

export type LinearTeam = { key: string; name: string };

export type ChatToken = { id: string; name: string; createdBy: string; createdAt: string; lastUsedAt: string | null };

export type CreatedChat = { chat: ChatToken; token: string };

export type Role = 'owner' | 'engineer';

export type GateView = {
  email: string;
  project: string;
  feature: string;
  from: string;
  to: string;
  toLabel: string;
  roles: Role[];
  approvals: Array<{ role: Role; email: string }>;
  canDecide: boolean;
  reason: string | null;
};

export type Decision = { decision: 'approve' | 'changes'; to: string };

export type Me = { email: string; engineer: boolean; teams: string[]; github: { login: string } | null };

export type ReviewPr = {
  repo: string; number: number; title: string; url: string; author: string; updatedAt: string;
  feature: { key: string; name: string } | null;
};
export type ReviewTdr = { title: string; path: string; url: string | null };
export type Reviews = { github: 'none' | 'ok' | 'failed'; prs: ReviewPr[]; tdrs: ReviewTdr[] };

export type Waiting = { kind: 'owner' | 'engineer' | 'agent'; names: string[] };

export type GithubPr = {
  state: 'open' | 'draft' | 'merged' | 'closed';
  review: 'approved' | 'changes requested' | null;
  checks: 'passing' | 'failing' | 'running' | null;
  pilot: string | null;
};

export type BuildRow = { issue: string; repo: string; pr: number | null; url: string | null; status: string; github: GithubPr | null };

export type QaCheck = { check: string; passed: boolean; evidence: string };

export type BoardCard = {
  key: string;
  slugId: string;
  id: string | null;
  name: string;
  url: string;
  team: string;
  owner: { name: string; email: string } | null;
  stage: string;
  days: number;
  since: string; // the day it entered its stage
  waitsFor: Waiting[];
  stuck: boolean;
  waitingForMe: boolean;
  notStarted: boolean;
  openGate: { id: string; from: string; to: string; opened: string; missing: Role[] } | null; // from, to: Linear labels
  build: BuildRow[];
  pilot: string | null;
  pilotMismatch: boolean;
  qa: { passed: number; failed: number } | null;
  agentActive: boolean;
};

export type StageBoard = {
  columns: Array<{ stage: string; cards: BoardCard[] }>;
  stuck: number;
  notice: string | null;
  at: string;
};

export type FeaturePanelView = {
  card: BoardCard;
  stages: Array<{ stage: string; status: string; date: string; file: string; by: string }>;
  log: Array<{ date: string; stage: string; who: string; text: string }>;
  gate: { url: string; from: string; to: string; missing: Role[] } | null;
  files: string[];
  linearUrl: string;
  folder: string | null;
  chatUrl: string | null;
  notice: string | null;
  checks: QaCheck[];
  about: ProjectAbout | null;
};
export type ProjectPost = { author: string; createdAt: string; body: string; health: 'onTrack' | 'atRisk' | 'offTrack' | null };
export type ProjectAbout = { summary: string; content: string; updates: ProjectPost[]; comments: ProjectPost[] };

export type IdeaOwners = { owners: Array<{ id: string; name: string; email: string }>; defaultOwnerId: string | null };

export type IdeaInput = { title: string; problem: string; audience: string; team: string; ownerId: string }; // ownerId '' = pick later

export type CreatedIdea = { uuid: string; slugId: string; url: string; chatUrl: string | null };
