import { fetchJson } from './fetchJson';

export const createLinearLabels = () => fetchJson<{ missing: string[] }>('/api/linear/labels', { method: 'POST' });
