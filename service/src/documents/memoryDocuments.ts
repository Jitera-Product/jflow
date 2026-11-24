import type { Documents } from './types.js';

export function memoryDocuments(files: Record<string, string> = {}): Documents {
  const store = new Map(Object.entries(files));
  return {
    async read(path) {
      return store.get(path) ?? null;
    },
    async list(path) {
      const prefix = path === '' || path.endsWith('/') ? path : path + '/';
      const names = new Set<string>();
      for (const key of store.keys()) {
        if (!key.startsWith(prefix)) continue;
        const rest = key.slice(prefix.length);
        const i = rest.indexOf('/');
        names.add(i < 0 ? rest : rest.slice(0, i + 1));
      }
      return [...names].sort();
    },
    async create(path, content) {
      if (store.has(path)) throw new Error(`documents: ${path} already exists`);
      store.set(path, content);
    },
    async update(path, content) {
      if (!store.has(path)) throw new Error(`documents: ${path} does not exist`);
      store.set(path, content);
    },
  };
}
