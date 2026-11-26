import type pg from 'pg';
import type { FeatureChatStore } from './types.js';

export function pgFeatureChatStore(db: pg.Pool): FeatureChatStore {
  return {
    async get(feature) {
      const r = await db.query('select chat_id from feature_chats where feature = $1', [feature]);
      return r.rows[0]?.chat_id ?? null;
    },
    async remember(feature, chatId, at) {
      await db.query(
        'insert into feature_chats (feature, chat_id, updated_at) values ($1, $2, $3) on conflict (feature) do nothing',
        [feature, chatId, at],
      );
    },
  };
}
