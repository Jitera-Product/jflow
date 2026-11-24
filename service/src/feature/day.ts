import type { Deps } from './types.js';

export const day = (deps: Deps) => deps.now().toISOString().slice(0, 10);
