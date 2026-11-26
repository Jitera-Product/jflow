export type Settings = {
  docsUrl: string;
  jiteraProject: string;
  docsToken: string;
  linearApiKey: string;
  teams: string[];
  engineers: string[];
  updatedBy: string | null;
  updatedAt: string | null;
};

export type SettingsInput = {
  docsUrl: string;
  jiteraProject: string;
  teams: string[];
  engineers: string[];
  docsToken?: string; // undefined or '' = keep the stored value
  linearApiKey?: string;
};

export type StoredValue = {
  docsUrl: string;
  jiteraProject: string;
  docsToken: string;
  linearApiKey: string;
  teams: string[];
  engineers: string[];
};

export type StoredRow = { value: StoredValue; updatedBy: string; updatedAt: Date };

export type SettingsStore = {
  load(): Promise<StoredRow | null>;
  save(value: StoredValue, by: string, at: Date): Promise<void>;
};

export type LiveSettings = {
  get(): Settings;
  save(input: SettingsInput, by: string): Promise<Settings>;
};
