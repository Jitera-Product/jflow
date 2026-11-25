import type { Settings } from '../settings/types.js';

export const settingsView = (email: string, s: Settings) => ({
  email,
  settings: {
    docsUrl: s.docsUrl,
    jiteraProject: s.jiteraProject,
    docsTokenSet: s.docsToken !== '',
    linearApiKeySet: s.linearApiKey !== '',
    teams: s.teams,
    engineers: s.engineers,
    updatedBy: s.updatedBy,
    updatedAt: s.updatedAt,
  },
});
