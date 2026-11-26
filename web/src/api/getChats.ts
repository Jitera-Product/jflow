import { fetchJson } from './fetchJson';
import type { ChatToken } from './types';

export const getChats = () => fetchJson<{ chats: ChatToken[] }>('/api/chats');
