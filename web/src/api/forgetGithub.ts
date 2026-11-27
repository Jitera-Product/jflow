import { fetchJson } from './fetchJson';

export const forgetGithub = () => fetchJson<unknown>('/api/me/github', { method: 'DELETE' });
