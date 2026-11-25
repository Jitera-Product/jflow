import { describe, expect, it, vi } from 'vitest';
import { checkSettings } from '../src/settings/checkSettings.js';
import { memorySettingsStore } from '../src/settings/memorySettingsStore.js';
import { openSecret } from '../src/settings/openSecret.js';
import { openSettings } from '../src/settings/openSettings.js';
import { sealSecret } from '../src/settings/sealSecret.js';
import { SettingsError } from '../src/settings/SettingsError.js';
import type { SettingsInput } from '../src/settings/types.js';

const KEY = 'k'.repeat(32);
const now = () => new Date('2026-11-25T00:00:00Z');
const ken = 'ken@jitera.com';
const input = (over: Partial<SettingsInput> = {}): SettingsInput => ({
  docsUrl: 'https://docs.example.com',
  jiteraProject: 'p',
  teams: ['CORE'],
  engineers: [ken],
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
  it('seeds engineers once', async () => {
    const store = memorySettingsStore();
    const s = await openSettings(store, KEY, ['Ken@Jitera.com'], now);
    expect(s.get().engineers).toEqual([ken]);
    expect(s.get().updatedBy).toBe('config');
    const again = await openSettings(store, KEY, ['other@x.com'], now);
    expect(again.get().engineers).toEqual([ken]);
  });

  it('stores secrets sealed and keeps them when blank', async () => {
    const store = memorySettingsStore();
    const s = await openSettings(store, KEY, [ken], now);
    await s.save(input({ docsToken: 'tok-1' }), ken);
    expect(s.get().docsToken).toBe('tok-1');
    expect(JSON.stringify(store.row)).not.toContain('tok-1');
    await s.save(input({ docsToken: '' }), ken);
    expect(s.get().docsToken).toBe('tok-1');
  });

  it('a changed key treats secrets as not set', async () => {
    const store = memorySettingsStore();
    const s = await openSettings(store, KEY, [ken], now);
    await s.save(input({ linearApiKey: 'lin-1' }), ken);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const other = await openSettings(store, 'z'.repeat(32), [ken], now);
    expect(other.get().linearApiKey).toBe('');
    expect(spy).toHaveBeenCalledWith('jflow: settings: cannot decrypt linearApiKey, set it again on /settings');
    expect(JSON.stringify(spy.mock.calls)).not.toContain('lin-1');
    spy.mockRestore();
  });

  it('refuses to drop the saver or empty the list', async () => {
    const s = await openSettings(memorySettingsStore(), KEY, [ken], now);
    const before = s.get();
    const err = await s.save(input({ engineers: [] }), ken).catch((e) => e);
    expect(err).toBeInstanceOf(SettingsError);
    expect(err.problems).toContain('keep at least one engineer');
    const err2 = await s.save(input({ engineers: ['mika@jitera.com'] }), ken).catch((e) => e);
    expect(err2.problems).toContain('you cannot remove yourself from engineers');
    expect(s.get()).toEqual(before);
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
  ])('%j -> %s', (over, problem) => {
    expect(checkSettings(input(over), ken)).toContain(problem);
  });

  it('accepts valid input, empty url and http localhost', () => {
    expect(checkSettings(input(), ken)).toEqual([]);
    expect(checkSettings(input({ docsUrl: '' }), ken)).toEqual([]);
    expect(checkSettings(input({ docsUrl: 'http://localhost:3000' }), ken)).toEqual([]);
    expect(checkSettings(input({ docsUrl: 'http://127.0.0.1:3000' }), ken)).toEqual([]);
  });
});
