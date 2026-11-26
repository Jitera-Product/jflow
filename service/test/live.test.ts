import { describe, expect, it } from 'vitest';
import type { DocumentsConnection } from '../src/config/types.js';
import { liveDocuments } from '../src/documents/liveDocuments.js';
import type { Documents } from '../src/documents/types.js';
import { FeatureError } from '../src/feature/FeatureError.js';
import { liveTracker } from '../src/linear/liveTracker.js';
import type { Tracker } from '../src/linear/types.js';
import type { LiveSettings, Settings } from '../src/settings/types.js';

const URL = 'https://flow.example.com';
const VERBS = {
  read: { tool: 'r', args: {} }, list: { tool: 'l', args: {} }, create: { tool: 'c', args: {} }, update: { tool: 'u', args: {} },
};
const BASE = { kind: 'jitera' as const, verbs: VERBS };

let s: Settings;
const settings: LiveSettings = { get: () => s, save: async () => s, claimFirstEngineer: async () => false };
const empty = (): Settings => ({
  docsUrl: '', jiteraProject: '', docsToken: '', linearApiKey: '', teams: [], engineers: ['ken@example.com'],
  publicUrl: URL, tdrFolder: '', productDocs: '', compliance: '', gateSecret: 's'.repeat(32), updatedBy: null, updatedAt: null,
});

function fakeDocs(made: DocumentsConnection[]) {
  return (conn: DocumentsConnection): Documents => {
    made.push(conn);
    return { read: async () => null, list: async () => ['a.md'], create: async () => {}, update: async () => {} };
  };
}

describe('live documents', () => {
  it('docs refuse with not_configured until url, project and token are set', async () => {
    s = { ...empty(), docsUrl: 'https://docs.example.com/mcp', docsToken: 'secret-token' };
    const docs = liveDocuments(settings, BASE, fakeDocs([]));
    const err = await docs.list('x').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(FeatureError);
    expect(err).toMatchObject({ code: 'not_configured', message: expect.stringContaining('https://flow.example.com/settings') });
    expect((err as Error).message).not.toContain('secret-token');
    s = { ...s, jiteraProject: 'p1' };
    expect(await docs.list('x')).toEqual(['a.md']);
  });
  it('docs reuse one client while settings stay the same', async () => {
    s = { ...empty(), docsUrl: 'https://docs.example.com/mcp', jiteraProject: 'p1', docsToken: 't1' };
    const made: DocumentsConnection[] = [];
    const docs = liveDocuments(settings, BASE, fakeDocs(made));
    await docs.list('x');
    await docs.read('y');
    expect(made).toHaveLength(1);
  });
  it('docs rebuild the client when the token, url or project changes', async () => {
    s = { ...empty(), docsUrl: 'https://docs.example.com/mcp', jiteraProject: 'p1', docsToken: 't1' };
    const made: DocumentsConnection[] = [];
    const docs = liveDocuments(settings, BASE, fakeDocs(made));
    await docs.list('x');
    s = { ...s, docsToken: 't2' };
    await docs.list('x');
    expect(made).toHaveLength(2);
    expect(made[1]).toEqual({
      kind: 'jitera', url: 'https://docs.example.com/mcp', token: 't2', headers: { 'x-jitera-project': 'p1' }, verbs: VERBS,
    });
    s = { ...s, docsUrl: 'https://docs2.example.com/mcp' };
    await docs.list('x');
    expect(made).toHaveLength(3);
    expect(made[2]).toMatchObject({ url: 'https://docs2.example.com/mcp', headers: { 'x-jitera-project': 'p1' } });
    s = { ...s, jiteraProject: 'p2' };
    await docs.list('x');
    expect(made).toHaveLength(4);
    expect(made[3]).toMatchObject({ url: 'https://docs2.example.com/mcp', headers: { 'x-jitera-project': 'p2' } });
  });
});

describe('live tracker', () => {
  it('tracker refuses with not_configured without a Linear key, and rebuilds when it changes', async () => {
    s = empty();
    const keys: string[] = [];
    const make = (key: string): Tracker => {
      keys.push(key);
      return { getProject: async () => null, setFlowLabel: async () => {} };
    };
    const tracker = liveTracker(settings, make);
    await expect(tracker.getProject('P-ENG-1')).rejects.toMatchObject({
      code: 'not_configured',
      message: 'jflow is not set up yet: the Linear API key is missing. An engineer sets it at https://flow.example.com/settings.',
    });
    s = { ...s, linearApiKey: 'k1' };
    await tracker.getProject('P-ENG-1');
    await tracker.setFlowLabel('id', 'flow:plan');
    s = { ...s, linearApiKey: 'k2' };
    await tracker.getProject('P-ENG-1');
    expect(keys).toEqual(['k1', 'k2']);
  });
});
