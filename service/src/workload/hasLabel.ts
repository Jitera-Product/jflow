import type { Issue } from './types.js';

export const hasLabel = (i: Issue, label: string): boolean => i.labels.includes(label);
