import type { SettingsStore, StoredRow } from './types.js';

export function memorySettingsStore(): SettingsStore & { row: StoredRow | null } {
  const store: SettingsStore & { row: StoredRow | null } = {
    row: null,
    async load() {
      return store.row;
    },
    async save(value, updatedBy, updatedAt) {
      store.row = { value, updatedBy, updatedAt };
    },
    async claimFirstEngineer(email, at) {
      if (!store.row || store.row.value.engineers.length > 0) return false;
      store.row = { value: { ...store.row.value, engineers: [email] }, updatedBy: email, updatedAt: at };
      return true;
    },
  };
  return store;
}
