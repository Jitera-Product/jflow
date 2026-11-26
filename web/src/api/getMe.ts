import { fetchJson } from './fetchJson';
import type { Me } from './types';

export const getMe = () => fetchJson<Me>('/api/me');
