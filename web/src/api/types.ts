export type SettingsView = {
  email: string;
  settings: {
    docsUrl: string;
    jiteraProject: string;
    docsTokenSet: boolean;
    linearApiKeySet: boolean;
    teams: string[];
    engineers: string[];
    updatedBy: string | null;
    updatedAt: string | null;
  };
};

export type SettingsInput = {
  docsUrl: string;
  jiteraProject: string;
  teams: string[];
  engineers: string[];
  docsToken?: string;
  linearApiKey?: string;
};

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
