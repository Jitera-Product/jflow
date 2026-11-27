import type { PersonalGithub, PersonalSettingsStore } from './types.js';

export function memoryPersonalSettingsStore(): PersonalSettingsStore & { rows: Map<string, PersonalGithub> } {
  const rows = new Map<string, PersonalGithub>();
  return {
    rows,
    async github(email) {
      return rows.get(email.toLowerCase()) ?? null;
    },
    async saveGithub(email, github) {
      rows.set(email.toLowerCase(), github);
    },
    async forgetGithub(email) {
      rows.delete(email.toLowerCase());
    },
  };
}
