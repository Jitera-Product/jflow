import type { Settings } from './types.js';

export const isConfigured = (s: Settings) => !!(s.linearApiKey && s.docsUrl && s.docsToken);
