import type { Settings } from '../settings/types.js';

export const settingsView = (email: string, s: Settings) => ({
  email,
  settings: {
    docsUrl: s.docsUrl,
    docsTokenSet: s.docsToken !== '',
    linearApiKeySet: s.linearApiKey !== '',
    teams: s.teams,
    tdrFolder: s.tdrFolder,
    flowAgentUrl: s.flowAgentUrl,
    engineers: s.engineers,
    updatedBy: s.updatedBy,
    updatedAt: s.updatedAt,
  },
});
