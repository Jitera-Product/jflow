import type { FeatureActivityStore } from './types.js';

export function memoryFeatureActivityStore(): FeatureActivityStore {
  const last = new Map<string, number>();
  return {
    async touch(feature, at) {
      last.set(feature, Math.max(last.get(feature) ?? 0, at.getTime()));
    },
    async since(at) {
      return [...last].filter(([, t]) => t >= at.getTime()).map(([f]) => f);
    },
  };
}
