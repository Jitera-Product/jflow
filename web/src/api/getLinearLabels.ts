import { fetchJson } from './fetchJson';

export const getLinearLabels = () => fetchJson<{ missing: string[] }>('/api/linear/labels');
