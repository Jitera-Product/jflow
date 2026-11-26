import { fetchJson } from './fetchJson';
import type { SetupView } from './types';

export const getSetup = () => fetchJson<SetupView>('/api/setup');
