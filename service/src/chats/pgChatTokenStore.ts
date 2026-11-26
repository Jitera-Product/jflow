import type pg from 'pg';
import type { ChatTokenStore } from './types.js';

export function pgChatTokenStore(db: pg.Pool): ChatTokenStore {
  return {
    async load() {
      const r = await db.query('select id, name, token, created_by, created_at, last_used_at from chat_tokens order by created_at, name');
      return r.rows.map((row) => ({
        id: row.id, name: row.name, token: row.token, createdBy: row.created_by, createdAt: row.created_at, lastUsedAt: row.last_used_at,
      }));
    },
    async insert(row) {
      const r = await db.query(
        `insert into chat_tokens (id, name, token, created_by, created_at, last_used_at) values ($1, $2, $3, $4, $5, $6)
         on conflict (name) do nothing`,
        [row.id, row.name, row.token, row.createdBy, row.createdAt, row.lastUsedAt],
      );
      return (r.rowCount ?? 0) > 0;
    },
    async remove(id) {
      const r = await db.query('delete from chat_tokens where id = $1', [id]);
      return (r.rowCount ?? 0) > 0;
    },
    async touch(id, at) {
      await db.query('update chat_tokens set last_used_at = $2 where id = $1', [id, at]);
    },
  };
}
