import type { FeatureChatStore } from './types.js';

export function memoryFeatureChatStore(): FeatureChatStore {
  const rows = new Map<string, string>();
  return {
    async get(feature) {
      return rows.get(feature) ?? null;
    },
    async remember(feature, chatId) {
      if (!rows.has(feature)) rows.set(feature, chatId);
    },
  };
}
