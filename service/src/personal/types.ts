export type PersonalGithub = { token: string; login: string };

export type PersonalSettingsStore = {
  github(email: string): Promise<PersonalGithub | null>;
  saveGithub(email: string, github: PersonalGithub, at: Date): Promise<void>;
  forgetGithub(email: string): Promise<void>;
};
