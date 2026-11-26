import { randomUUID } from 'node:crypto';
import { same } from '../http/same.js';
import { openSecret } from '../settings/openSecret.js';
import { sealSecret } from '../settings/sealSecret.js';
import { ChatTokenError } from './ChatTokenError.js';
import { newToken } from './newToken.js';
import type { ChatToken, ChatTokenStore, LiveChatTokens, StoredChatToken } from './types.js';

const USE_WRITE_MS = 60_000;

export async function openChatTokens(
  store: ChatTokenStore,
  key: string,
  legacy: Array<{ name: string; token: string }>,
  now: () => Date,
): Promise<LiveChatTokens> {
  const rows = await store.load();
  for (const l of legacy) {
    if (rows.some((r) => r.name === l.name)) continue;
    const row: StoredChatToken = { id: randomUUID(), name: l.name, token: sealSecret(key, l.token), createdBy: 'jflow', createdAt: now(), lastUsedAt: null };
    if (!(await store.insert(row))) continue;
    rows.push(row);
    console.warn(`jflow: imported chat client ${l.name} from JFLOW_CONFIG`);
  }

  const toChat = (r: StoredChatToken): ChatToken => ({
    id: r.id, name: r.name, createdBy: r.createdBy, createdAt: r.createdAt.toISOString(), lastUsedAt: r.lastUsedAt?.toISOString() ?? null,
  });
  // A token that cannot be opened stays listed, so it can be revoked and its name used again.
  let chats = rows.map((r) => {
    const token = openSecret(key, r.token);
    if (!token) console.warn(`jflow: chats: cannot decrypt the token of ${r.name} (JFLOW_SETTINGS_KEY changed?); revoke it and create a new one`);
    return { chat: toChat(r), token: token || null };
  });

  return {
    list: () => chats.map((c) => c.chat),
    find(token) {
      // No early return: every stored token is compared, so the time does not tell which one matched.
      let hit: ChatToken | null = null;
      for (const c of chats) if (c.token !== null && same(c.token, token)) hit = c.chat;
      return hit;
    },
    tokens: () => chats.flatMap((c) => (c.token === null ? [] : [c.token])),
    async create(name, by) {
      const token = newToken();
      const row: StoredChatToken = { id: randomUUID(), name, token: sealSecret(key, token), createdBy: by, createdAt: now(), lastUsedAt: null };
      if (chats.some((c) => c.chat.name === name) || !(await store.insert(row))) {
        throw new ChatTokenError('name_taken', `a chat token named ${name} exists`);
      }
      const chat = toChat(row);
      chats = [...chats, { chat, token }];
      return { chat, token };
    },
    async revoke(id) {
      const gone = await store.remove(id);
      chats = chats.filter((c) => c.chat.id !== id);
      return gone;
    },
    used(id) {
      const c = chats.find((x) => x.chat.id === id);
      const at = now();
      if (!c || (c.chat.lastUsedAt && at.getTime() - Date.parse(c.chat.lastUsedAt) < USE_WRITE_MS)) return;
      c.chat = { ...c.chat, lastUsedAt: at.toISOString() };
      store.touch(id, at).catch((e: unknown) => {
        console.error(`jflow: chats: cannot record the use of ${c.chat.name}: ${e instanceof Error ? e.message : String(e)}`);
      });
    },
  };
}
