import { fetchJson } from './fetchJson';
import type { CreatedChat } from './types';

export const createChat = (name: string) => fetchJson<CreatedChat>('/api/chats', { method: 'POST', body: { name } });
