import type { ChatTokenStore, StoredChatToken } from './types.js';

export function memoryChatTokenStore(): ChatTokenStore & { rows: StoredChatToken[] } {
  const store: ChatTokenStore & { rows: StoredChatToken[] } = {
    rows: [],
    async load() {
      return store.rows.map((r) => ({ ...r }));
    },
    async insert(row) {
      if (store.rows.some((r) => r.name === row.name)) return false;
      store.rows.push({ ...row });
      return true;
    },
    async remove(id) {
      const before = store.rows.length;
      store.rows = store.rows.filter((r) => r.id !== id);
      return store.rows.length < before;
    },
    async touch(id, at) {
      for (const r of store.rows) if (r.id === id) r.lastUsedAt = at;
    },
  };
  return store;
}
