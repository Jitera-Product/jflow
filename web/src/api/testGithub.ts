import { fetchJson } from './fetchJson';
import type { SetupStep } from './types';

export const testGithub = (githubToken: string) =>
  fetchJson<SetupStep>('/api/setup/github', { method: 'POST', body: { githubToken } });
