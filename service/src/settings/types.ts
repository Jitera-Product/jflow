export type Settings = {
  docsUrl: string;
  docsToken: string;
  linearApiKey: string;
  teams: string[];
  engineers: string[];
  publicUrl: string; // bare origin, no trailing slash; '' until set
  tdrFolder: string;
  gateSecret: string;
  legacyChatsImported: boolean;
  updatedBy: string | null;
  updatedAt: string | null;
};

export type SettingsInput = {
  docsUrl: string;
  teams: string[];
  engineers: string[];
  publicUrl?: string; // undefined or '' = keep the stored value
  tdrFolder?: string; // undefined = keep the stored value; '' clears it
  docsToken?: string;
  linearApiKey?: string;
};

export type StoredValue = {
  docsUrl: string;
  docsToken: string;
  linearApiKey: string;
  teams: string[];
  engineers: string[];
  publicUrl: string;
  tdrFolder: string;
  gateSecret: string;
  legacyChatsImported: boolean; // the JFLOW_CONFIG chat clients are imported once, so a revoked one stays revoked
};

export type StoredRow = { value: StoredValue; updatedBy: string; updatedAt: Date };

export type SettingsStore = {
  load(): Promise<StoredRow | null>;
  save(value: StoredValue, by: string, at: Date): Promise<void>;
  claimFirstEngineer(email: string, at: Date): Promise<boolean>;
};

export type LegacySettings = { engineers?: string[]; publicUrl?: string; gateSecret?: string };

export type LiveSettings = {
  get(): Settings;
  save(input: SettingsInput, by: string): Promise<Settings>;
  claimFirstEngineer(email: string): Promise<boolean>;
  markLegacyChatsImported(): Promise<void>;
};
