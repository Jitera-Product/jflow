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
  };
  return store;
}
