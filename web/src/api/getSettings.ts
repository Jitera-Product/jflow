import { fetchJson } from './fetchJson';
import type { SettingsView } from './types';

export const getSettings = () => fetchJson<SettingsView>('/api/settings');
