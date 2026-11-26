export type Settings = {
  docsUrl: string;
  jiteraProject: string;
  docsToken: string;
  linearApiKey: string;
  teams: string[];
  engineers: string[];
  publicUrl: string; // bare origin, no trailing slash; '' until set
  tdrFolder: string;
  productDocs: string;
  compliance: string;
  gateSecret: string;
  updatedBy: string | null;
  updatedAt: string | null;
};

export type SettingsInput = {
  docsUrl: string;
  jiteraProject: string;
  teams: string[];
  engineers: string[];
  publicUrl?: string; // undefined or '' = keep the stored value
  tdrFolder?: string; // undefined = keep the stored value; '' clears it
  productDocs?: string;
  compliance?: string;
  docsToken?: string;
  linearApiKey?: string;
};

export type StoredValue = {
  docsUrl: string;
  jiteraProject: string;
  docsToken: string;
  linearApiKey: string;
  teams: string[];
  engineers: string[];
  publicUrl: string;
  tdrFolder: string;
  productDocs: string;
  compliance: string;
  gateSecret: string;
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
};
