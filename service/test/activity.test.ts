import { describe, expect, it } from 'vitest';
import { memoryFeatureActivityStore } from '../src/activity/memoryFeatureActivityStore.js';

describe('memoryFeatureActivityStore', () => {
  it('keeps the latest tool call per feature', async () => {
    const s = memoryFeatureActivityStore();
    await s.touch('P-ENG-1', new Date('2026-11-26T10:00:00Z'));
    await s.touch('P-ENG-1', new Date('2026-11-26T09:00:00Z'));
    await s.touch('P-ENG-2', new Date('2026-11-26T09:30:00Z'));
    expect(await s.since(new Date('2026-11-26T09:45:00Z'))).toEqual(['P-ENG-1']);
    expect((await s.since(new Date('2026-11-26T09:30:00Z'))).sort()).toEqual(['P-ENG-1', 'P-ENG-2']);
  });
});
