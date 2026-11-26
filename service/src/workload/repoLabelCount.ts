import type { Issue } from './types.js';

export const repoLabelCount = (i: Issue): number => i.labels.filter((l) => l.startsWith('repo:')).length;
