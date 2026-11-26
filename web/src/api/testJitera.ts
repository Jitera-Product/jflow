import { fetchJson } from './fetchJson';
import type { SetupStep } from './types';

export const testJitera = (docsUrl: string, docsToken: string) =>
  fetchJson<SetupStep>('/api/setup/jitera', { method: 'POST', body: { docsUrl, docsToken } });
