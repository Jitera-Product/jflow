import { describe, expect, it, vi } from 'vitest';
import { ChatTokenError } from '../src/chats/ChatTokenError.js';
import { importLegacyTokens } from '../src/chats/importLegacyTokens.js';
import { memoryChatTokenStore } from '../src/chats/memoryChatTokenStore.js';
import { newToken } from '../src/chats/newToken.js';
import { openChatTokens } from '../src/chats/openChatTokens.js';
import { startChatTokens } from '../src/chats/startChatTokens.js';
import type { Config } from '../src/config/types.js';
import { memorySettingsStore } from '../src/settings/memorySettingsStore.js';
import { openSecret } from '../src/settings/openSecret.js';
import { openSettings } from '../src/settings/openSettings.js';

const KEY = 'k'.repeat(32);
const T0 = new Date('2026-11-26T00:00:00Z').getTime();

function clock() {
  let t = T0;
  return { now: () => new Date(t), tick: (ms: number) => { t += ms; } };
}

describe('newToken', () => {
  it('is 32 random bytes in base64url', () => {
    const a = newToken();
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(newToken()).not.toBe(a);
  });
});

describe('openChatTokens', () => {
  it('create returns the token once, list never holds it, and the store keeps it sealed', async () => {
    const store = memoryChatTokenStore();
    const chats = await openChatTokens(store, KEY, [], clock().now);
    const { chat, token } = await chats.create('jitera-chat', 'mika@jitera.com');
    expect(token).toHaveLength(43);
    expect(chat).toEqual({ id: expect.any(String), name: 'jitera-chat', createdBy: 'mika@jitera.com', createdAt: '2026-11-26T00:00:00.000Z', lastUsedAt: null });
    expect(chats.list()).toEqual([chat]);
    expect(JSON.stringify(chats.list())).not.toContain(token);
    expect(JSON.stringify(store.rows)).not.toContain(token);
    expect(openSecret(KEY, store.rows[0]!.token)).toBe(token);
    expect(chats.find(token)).toEqual(chat);
    expect(chats.find('x'.repeat(43))).toBeNull();
    expect(chats.tokens()).toEqual([token]);
    const again = await openChatTokens(store, KEY, [], clock().now);
    expect(again.find(token)?.id).toBe(chat.id);
  });

  it('find of a revoked token is null, at once and after a reopen', async () => {
    const store = memoryChatTokenStore();
    const chats = await openChatTokens(store, KEY, [], clock().now);
    const { chat, token } = await chats.create('a', 'mika@jitera.com');
    expect(await chats.revoke(chat.id)).toBe(true);
    expect(chats.find(token)).toBeNull();
    expect(chats.tokens()).toEqual([]);
    expect(chats.list()).toEqual([]);
    expect(await chats.revoke(chat.id)).toBe(false);
    expect((await openChatTokens(store, KEY, [], clock().now)).find(token)).toBeNull();
  });

  it('two creates with the same name: the second is name_taken', async () => {
    const chats = await openChatTokens(memoryChatTokenStore(), KEY, [], clock().now);
    await chats.create('a', 'mika@jitera.com');
    const err = await chats.create('a', 'ken@jitera.com').catch((e) => e);
    expect(err).toBeInstanceOf(ChatTokenError);
    expect(err.code).toBe('name_taken');
    expect(chats.list()).toHaveLength(1);
  });

  it('a name taken in the store by another process is name_taken too', async () => {
    const store = memoryChatTokenStore();
    const chats = await openChatTokens(store, KEY, [], clock().now);
    await (await openChatTokens(store, KEY, [], clock().now)).create('a', 'ken@jitera.com');
    expect((await chats.create('a', 'mika@jitera.com').catch((e) => e)).code).toBe('name_taken');
  });

  it('imports a legacy token once, says so, and keeps an existing name untouched', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const store = memoryChatTokenStore();
    const first = await openChatTokens(store, KEY, [{ name: 'agent', token: 'a'.repeat(32) }], clock().now);
    expect(first.find('a'.repeat(32))).toMatchObject({ name: 'agent', createdBy: 'jflow' });
    expect(warn.mock.calls.map((a) => a[0])).toEqual(['jflow: imported chat client agent from JFLOW_CONFIG']);
    expect(JSON.stringify(store.rows)).not.toContain('a'.repeat(32));
    warn.mockClear();
    const again = await openChatTokens(store, KEY, [{ name: 'agent', token: 'b'.repeat(32) }], clock().now);
    expect(again.find('a'.repeat(32))?.name).toBe('agent');
    expect(again.find('b'.repeat(32))).toBeNull();
    expect(store.rows).toHaveLength(1);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('a token that cannot be opened is skipped with a warning; it stays listed so it can be revoked', async () => {
    const store = memoryChatTokenStore();
    const { token } = await (await openChatTokens(store, KEY, [], clock().now)).create('old', 'mika@jitera.com');
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const chats = await openChatTokens(store, 'z'.repeat(32), [], clock().now);
    expect(chats.find(token)).toBeNull();
    expect(chats.tokens()).toEqual([]);
    expect(chats.list().map((c) => c.name)).toEqual(['old']);
    expect(warn).toHaveBeenCalledWith('jflow: chats: cannot decrypt the token of old (JFLOW_SETTINGS_KEY changed?); revoke it and create a new one');
    expect(JSON.stringify(warn.mock.calls)).not.toContain(token);
    warn.mockRestore();
    expect(await chats.revoke(chats.list()[0]!.id)).toBe(true);
    expect(store.rows).toEqual([]);
  });

  it('used writes last_used_at at most once a minute per token', async () => {
    const c = clock();
    const store = memoryChatTokenStore();
    const touched: string[] = [];
    const touch = store.touch;
    store.touch = async (id, at) => { touched.push(at.toISOString()); await touch(id, at); };
    const chats = await openChatTokens(store, KEY, [], c.now);
    const a = (await chats.create('a', 'mika@jitera.com')).chat;
    const b = (await chats.create('b', 'mika@jitera.com')).chat;
    chats.used(a.id);
    c.tick(30_000);
    chats.used(a.id);
    chats.used(b.id);
    c.tick(31_000);
    chats.used(a.id);
    await new Promise((r) => setTimeout(r, 0));
    expect(touched).toEqual(['2026-11-26T00:00:00.000Z', '2026-11-26T00:00:30.000Z', '2026-11-26T00:01:01.000Z']);
    expect(chats.list().find((x) => x.id === a.id)?.lastUsedAt).toBe('2026-11-26T00:01:01.000Z');
    expect(store.rows.find((r) => r.id === a.id)?.lastUsedAt?.toISOString()).toBe('2026-11-26T00:01:01.000Z');
  });

  it('a failed last_used_at write is logged, never thrown', async () => {
    const store = memoryChatTokenStore();
    store.touch = async () => { throw new Error('db down'); };
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const chats = await openChatTokens(store, KEY, [], clock().now);
    const { chat, token } = await chats.create('a', 'mika@jitera.com');
    expect(() => chats.used(chat.id)).not.toThrow();
    await new Promise((r) => setTimeout(r, 0));
    expect(err).toHaveBeenCalledWith('jflow: chats: cannot record the use of a: db down');
    expect(JSON.stringify(err.mock.calls)).not.toContain(token);
    err.mockRestore();
  });
});

describe('importLegacyTokens', () => {
  const config = (legacy: Config['legacy']) => ({ legacy }) as Config;

  it('takes each legacy client with its env token and skips a missing or short one, naming the variable only', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const got = importLegacyTokens(
      config({ mcpClients: [{ name: 'agent', tokenEnv: 'MCP_TOKEN' }, { name: 'gone', tokenEnv: 'MCP_GONE' }, { name: 'short', tokenEnv: 'MCP_SHORT' }] }),
      { MCP_TOKEN: 'm'.repeat(32), MCP_SHORT: 'shortvalue' },
    );
    expect(got).toEqual([{ name: 'agent', token: 'm'.repeat(32) }]);
    expect(warn.mock.calls.map((a) => a[0])).toEqual([
      'jflow: MCP_GONE is missing or shorter than 32 characters; chat client gone is skipped',
      'jflow: MCP_SHORT is missing or shorter than 32 characters; chat client short is skipped',
    ]);
    expect(JSON.stringify(warn.mock.calls)).not.toContain('m'.repeat(32));
    expect(JSON.stringify(warn.mock.calls)).not.toContain('shortvalue');
    warn.mockRestore();
  });

  it('is empty without a legacy file', () => {
    expect(importLegacyTokens(config(null), {})).toEqual([]);
    expect(importLegacyTokens(config({}), {})).toEqual([]);
  });
});

describe('startChatTokens', () => {
  const legacyConfig = { settingsKey: KEY, legacy: { mcpClients: [{ name: 'agent', tokenEnv: 'MCP_TOKEN' }] } } as Config;
  const env = { MCP_TOKEN: 'm'.repeat(32) };

  it('imports the legacy clients once: a revoked one stays revoked on the next start', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const settingsStore = memorySettingsStore();
    const store = memoryChatTokenStore();
    const settings = await openSettings(settingsStore, KEY, {}, clock().now);
    const first = await startChatTokens(store, settings, legacyConfig, env, clock().now);
    const agent = first.find('m'.repeat(32));
    expect(agent?.name).toBe('agent');
    expect(settings.get().legacyChatsImported).toBe(true);
    expect(await first.revoke(agent!.id)).toBe(true);
    warn.mockClear();
    const again = await openSettings(settingsStore, KEY, {}, clock().now);
    const second = await startChatTokens(store, again, legacyConfig, env, clock().now);
    expect(second.find('m'.repeat(32))).toBeNull();
    expect(store.rows).toEqual([]);
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it('a fresh start with no legacy clients sets the marker too', async () => {
    const settingsStore = memorySettingsStore();
    const settings = await openSettings(settingsStore, KEY, {}, clock().now);
    expect(settings.get().legacyChatsImported).toBe(false);
    await startChatTokens(memoryChatTokenStore(), settings, { settingsKey: KEY, legacy: null } as Config, {}, clock().now);
    expect(settings.get().legacyChatsImported).toBe(true);
    expect(settingsStore.row?.value.legacyChatsImported).toBe(true);
    const later = await startChatTokens(memoryChatTokenStore(), await openSettings(settingsStore, KEY, {}, clock().now), legacyConfig, env, clock().now);
    expect(later.list()).toEqual([]);
  });
});
