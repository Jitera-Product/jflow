export type SettingsView = {
  email: string;
  settings: {
    docsUrl: string;
      docsTokenSet: boolean;
    linearApiKeySet: boolean;
    teams: string[];
    engineers: string[];
    publicUrl: string;
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
  publicUrl?: string; // blank or missing = keep the stored one
  docsToken?: string;
  linearApiKey?: string;
};

export type SetupStep = { ok: boolean; message?: string };

export type SetupView = { linear: SetupStep; jitera: SetupStep; chats: { ok: boolean } };

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

export type Me = { email: string; engineer: boolean; teams: string[] };

export type Waiting = { kind: 'owner' | 'engineer' | 'agent'; names: string[] };

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
  waitsFor: Waiting[];
  stuck: boolean;
  waitingForMe: boolean;
  notStarted: boolean;
  behind: boolean;
  openGate: { id: string; to: string; opened: string; missing: Role[] } | null;
};

export type StageBoard = {
  columns: Array<{ stage: string; cards: BoardCard[] }>;
  stuck: number;
  notice: string | null;
  at: string;
};

export type FeaturePanelView = {
  card: BoardCard;
  stages: Array<{ stage: string; status: string; date: string }>;
  log: Array<{ date: string; stage: string; who: string; text: string }>;
  gate: { url: string; from: string; to: string; missing: Role[] } | null;
  files: string[];
  linearUrl: string;
  behind: boolean;
  folder: string | null;
  chatUrl: string | null;
  notice: string | null;
};

export type IdeaOwners = { owners: Array<{ id: string; name: string; email: string }>; defaultOwnerId: string | null };

export type IdeaInput = { title: string; problem: string; audience: string; team: string; ownerId: string };

export type CreatedIdea = { uuid: string; slugId: string; url: string };
