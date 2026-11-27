import { fetchJson } from './fetchJson';

export const connectGithub = (token: string) => fetchJson<{ login: string }>('/api/me/github', { method: 'POST', body: { token } });
