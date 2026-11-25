import { fetchJson } from './fetchJson';
import type { SettingsInput, SettingsView } from './types';

export const saveSettings = (input: SettingsInput) => fetchJson<SettingsView>('/api/settings', { method: 'POST', body: input });
