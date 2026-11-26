import { fetchJson } from './fetchJson';

export const revokeChat = (id: string) => fetchJson<unknown>(`/api/chats/${encodeURIComponent(id)}`, { method: 'DELETE' });
