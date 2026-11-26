import { describe, expect, it, vi } from 'vitest';
import type { Config } from '../src/config/types.js';
import { checkSettings } from '../src/settings/checkSettings.js';
import { importLegacySettings } from '../src/settings/importLegacySettings.js';
import { memorySettingsStore } from '../src/settings/memorySettingsStore.js';
import { openSecret } from '../src/settings/openSecret.js';
import { openSettings } from '../src/settings/openSettings.js';
import { sealSecret } from '../src/settings/sealSecret.js';
import { SettingsError } from '../src/settings/SettingsError.js';
import type { SettingsInput, StoredValue } from '../src/settings/types.js';

const KEY = 'k'.repeat(32);
const now = () => new Date('2026-11-25T00:00:00Z');
const ken = 'ken@jitera.com';
const input = (over: Partial<SettingsInput> = {}): SettingsInput => ({
  docsUrl: 'https://docs.example.com',
  jiteraProject: 'p',
  teams: ['CORE'],
  engineers: [ken],
  tdrFolder: '',
  productDocs: '',
  compliance: '',
  ...over,
});

describe('secrets', () => {
  it('sealSecret/openSecret round-trip, and a wrong key gives null', () => {
    const sealed = sealSecret(KEY, 'hello');
    expect(sealed).not.toContain('hello');
    expect(openSecret(KEY, sealed)).toBe('hello');
    expect(openSecret('z'.repeat(32), sealed)).toBeNull();
    expect(openSecret(KEY, 'garbage')).toBeNull();
    expect(sealSecret(KEY, '')).toBe('');
    expect(openSecret(KEY, '')).toBe('');
    expect(sealSecret(KEY, 'hello')).not.toBe(sealed);
  });
});

describe('openSettings', () => {
  it('a fresh store has no engineers, a random gate secret and no publicUrl', async () => {
    const store = memorySettingsStore();
    const s = await openSettings(store, KEY, {}, now);
    expect(s.get()).toMatchObject({ engineers: [], publicUrl: '', tdrFolder: '', productDocs: '', compliance: '' });
    expect(s.get().gateSecret.length).toBeGreaterThanOrEqual(32);
    expect(JSON.stringify(store.row)).not.toContain(s.get().gateSecret);
    let saves = 0;
    const counting = { ...store, load: store.load, save: async (...a: Parameters<typeof store.save>) => { saves++; await store.save(...a); } };
    const again = await openSettings(counting, KEY, {}, now);
    expect(again.get().gateSecret).toBe(s.get().gateSecret);
    expect(saves).toBe(0);
  });

  it('the first claim wins, the second does not', async () => {
    const live = await openSettings(memorySettingsStore(), KEY, {}, now);
    expect(await live.claimFirstEngineer('A@x.com')).toBe(true);
    expect(await live.claimFirstEngineer('b@x.com')).toBe(false);
    expect(live.get().engineers).toEqual(['a@x.com']);
    expect(live.get().updatedBy).toBe('a@x.com');
  });

  it('a claim lost to another process picks up the stored engineer', async () => {
    const store = memorySettingsStore();
    const live = await openSettings(store, KEY, {}, now);
    const other = await openSettings(store, KEY, {}, now);
    expect(await other.claimFirstEngineer('a@x.com')).toBe(true);
    expect(await live.claimFirstEngineer('b@x.com')).toBe(false);
    expect(live.get().engineers).toEqual(['a@x.com']);
  });

  it('imports legacy values only into empty fields', async () => {
    const store = memorySettingsStore();
    const live = await openSettings(store, KEY, { engineers: ['Ken@x.com'], publicUrl: 'https://flow.example.com/', gateSecret: 'g'.repeat(32) }, now);
    expect(live.get()).toMatchObject({ engineers: ['ken@x.com'], publicUrl: 'https://flow.example.com', gateSecret: 'g'.repeat(32) });
    expect(JSON.stringify(store.row)).not.toContain('g'.repeat(32));
    await live.save(input({ engineers: ['ken@x.com'], publicUrl: 'https://other.example.com' }), 'ken@x.com');
    const again = await openSettings(store, KEY, { engineers: ['mika@x.com'], publicUrl: 'https://flow.example.com/', gateSecret: 'h'.repeat(32) }, now);
    expect(again.get().publicUrl).toBe('https://other.example.com');
    expect(again.get().gateSecret).toBe('g'.repeat(32));
    expect(again.get().engineers).toEqual(['ken@x.com']);
  });

  it('skips a legacy publicUrl that is not a bare origin', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const s = await openSettings(memorySettingsStore(), KEY, { publicUrl: 'https://flow.example.com/app' }, now);
    expect(s.get().publicUrl).toBe('');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('bare origin'));
    warn.mockRestore();
  });

  it('loads a row from before publicUrl and the gate secret, and keeps its engineers', async () => {
    const store = memorySettingsStore();
    const old = { docsUrl: 'https://docs.example.com', jiteraProject: 'p', docsToken: sealSecret(KEY, 'tok-1'), linearApiKey: '', teams: ['CORE'], engineers: [ken] };
    store.row = { value: old as unknown as StoredValue, updatedBy: ken, updatedAt: now() };
    const s = await openSettings(store, KEY, { engineers: ['mika@x.com'], publicUrl: 'https://flow.example.com', gateSecret: 'g'.repeat(32) }, now);
    expect(s.get()).toMatchObject({
      engineers: [ken], docsToken: 'tok-1', teams: ['CORE'], publicUrl: 'https://flow.example.com', gateSecret: 'g'.repeat(32),
      tdrFolder: '', productDocs: '', compliance: '', updatedBy: ken,
    });
    expect(openSecret(KEY, store.row!.value.gateSecret)).toBe('g'.repeat(32));
    const fresh = memorySettingsStore();
    fresh.row = { value: old as unknown as StoredValue, updatedBy: ken, updatedAt: now() };
    expect((await openSettings(fresh, KEY, {}, now)).get().gateSecret.length).toBeGreaterThanOrEqual(32);
  });

  it('stops when the stored gate secret cannot be opened', async () => {
    const store = memorySettingsStore();
    await openSettings(store, KEY, {}, now);
    await expect(openSettings(store, 'other'.repeat(8), {}, now)).rejects.toThrow(/gate secret.*JFLOW_SETTINGS_KEY/);
    await expect(openSettings(store, 'other'.repeat(8), { gateSecret: 'g'.repeat(32) }, now)).rejects.toThrow(/gate secret/);
  });

  it('stores secrets sealed and keeps them when blank', async () => {
    const store = memorySettingsStore();
    const s = await openSettings(store, KEY, { engineers: [ken] }, now);
    await s.save(input({ docsToken: 'tok-1' }), ken);
    expect(s.get().docsToken).toBe('tok-1');
    expect(JSON.stringify(store.row)).not.toContain('tok-1');
    await s.save(input({ docsToken: '' }), ken);
    expect(s.get().docsToken).toBe('tok-1');
  });

  it('saves publicUrl and the team settings, and keeps publicUrl and the gate secret when not sent', async () => {
    const s = await openSettings(memorySettingsStore(), KEY, { engineers: [ken] }, now);
    const secret = s.get().gateSecret;
    await s.save(input({ publicUrl: 'https://flow.example.com/', tdrFolder: 'TDR', productDocs: 'Specs', compliance: 'ISMAP' }), ken);
    expect(s.get()).toMatchObject({ publicUrl: 'https://flow.example.com', tdrFolder: 'TDR', productDocs: 'Specs', compliance: 'ISMAP', gateSecret: secret });
    await s.save(input(), ken);
    expect(s.get().publicUrl).toBe('https://flow.example.com');
    expect(s.get().gateSecret).toBe(secret);
  });

  it('a secret that cannot be opened is treated as not set', async () => {
    const store = memorySettingsStore();
    const s = await openSettings(store, KEY, { engineers: [ken] }, now);
    await s.save(input({ linearApiKey: 'lin-1' }), ken);
    store.row!.value.linearApiKey = sealSecret('z'.repeat(32), 'lin-1');
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const other = await openSettings(store, KEY, {}, now);
    expect(other.get().linearApiKey).toBe('');
    expect(spy).toHaveBeenCalledWith('jflow: settings: cannot decrypt linearApiKey, set it again on /settings');
    expect(JSON.stringify(spy.mock.calls)).not.toContain('lin-1');
    spy.mockRestore();
  });

  it('refuses to drop the saver or empty the list', async () => {
    const s = await openSettings(memorySettingsStore(), KEY, { engineers: [ken] }, now);
    const before = s.get();
    const err = await s.save(input({ engineers: [] }), ken).catch((e) => e);
    expect(err).toBeInstanceOf(SettingsError);
    expect(err.problems).toContain('keep at least one engineer');
    const err2 = await s.save(input({ engineers: ['mika@jitera.com'] }), ken).catch((e) => e);
    expect(err2.problems).toContain('you cannot remove yourself from engineers');
    expect(s.get()).toEqual(before);
  });

  it('refuses a publicUrl with a path', async () => {
    const s = await openSettings(memorySettingsStore(), KEY, { engineers: [ken] }, now);
    const err = await s.save(input({ publicUrl: 'https://x.com/app' }), ken).catch((e) => e);
    expect(err).toBeInstanceOf(SettingsError);
    expect(err.message).toMatch(/bare origin/);
  });
});

describe('importLegacySettings', () => {
  const config = (legacy: Config['legacy']) => ({ legacy }) as Config;

  it('takes engineers and publicUrl from the old file and the gate secret from the env, with one warning per source', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const got = importLegacySettings(config({ engineers: ['Ken@x.com'], publicUrl: 'https://flow.example.com/' }), { JFLOW_GATE_SECRET: 'g'.repeat(32) });
    expect(got).toEqual({ engineers: ['Ken@x.com'], publicUrl: 'https://flow.example.com/', gateSecret: 'g'.repeat(32) });
    expect(warn.mock.calls.map((a) => a[0])).toEqual([
      'jflow: imported engineers and publicUrl from JFLOW_CONFIG; you can remove JFLOW_CONFIG now',
      'jflow: imported the gate secret from JFLOW_GATE_SECRET; you can remove JFLOW_GATE_SECRET now',
    ]);
    expect(JSON.stringify(warn.mock.calls)).not.toContain('g'.repeat(32));
    warn.mockRestore();
  });

  it('is empty and quiet without old sources', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(importLegacySettings(config(null), {})).toEqual({});
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('checkSettings', () => {
  it.each([
    [{ docsUrl: 'http://example.com' }, 'docsUrl must be an https URL'],
    [{ docsUrl: 'nope' }, 'docsUrl must be an https URL'],
    [{ teams: ['core'] }, 'team key "core" must be letters and digits, like CORE'],
    [{ engineers: [ken, 'bad'] }, '"bad" is not an email'],
    [{ engineers: [] }, 'keep at least one engineer'],
    [{ engineers: ['mika@jitera.com'] }, 'you cannot remove yourself from engineers'],
    [{ publicUrl: 'https://flow.example.com/app' }, 'publicUrl must be a bare origin like https://flow.example.com, with no path, query or hash'],
    [{ publicUrl: 'https://flow.example.com/?a=1' }, 'publicUrl must be a bare origin like https://flow.example.com, with no path, query or hash'],
    [{ publicUrl: 'ftp://flow.example.com' }, 'publicUrl must be a bare origin like https://flow.example.com, with no path, query or hash'],
  ])('%j -> %s', (over, problem) => {
    expect(checkSettings(input(over), ken)).toContain(problem);
  });

  it('accepts valid input, empty url and http localhost', () => {
    expect(checkSettings(input(), ken)).toEqual([]);
    expect(checkSettings(input({ docsUrl: '' }), ken)).toEqual([]);
    expect(checkSettings(input({ docsUrl: 'http://localhost:3000' }), ken)).toEqual([]);
    expect(checkSettings(input({ docsUrl: 'http://127.0.0.1:3000' }), ken)).toEqual([]);
    expect(checkSettings(input({ publicUrl: 'https://flow.example.com/' }), ken)).toEqual([]);
    expect(checkSettings(input({ publicUrl: 'http://localhost:8080' }), ken)).toEqual([]);
  });
});
