export type SettingsView = {
  email: string;
  settings: {
    docsUrl: string;
    jiteraProject: string;
    docsTokenSet: boolean;
    linearApiKeySet: boolean;
    teams: string[];
    engineers: string[];
    publicUrl: string;
    tdrFolder: string;
    productDocs: string;
    compliance: string;
    updatedBy: string | null;
    updatedAt: string | null;
  };
};

export type SettingsInput = {
  docsUrl: string;
  jiteraProject: string;
  teams: string[];
  engineers: string[];
  tdrFolder: string;
  productDocs: string;
  compliance: string;
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
