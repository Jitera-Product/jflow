import type pg from 'pg';
import type { SettingsStore } from './types.js';

export function pgSettingsStore(db: pg.Pool): SettingsStore {
  return {
    async load() {
      const r = await db.query('select value, updated_by, updated_at from settings where id = 1');
      const row = r.rows[0];
      return row ? { value: row.value, updatedBy: row.updated_by, updatedAt: row.updated_at } : null;
    },
    async save(value, by, at) {
      await db.query(
        `insert into settings (id, value, updated_by, updated_at) values (1, $1, $2, $3)
         on conflict (id) do update set value = excluded.value, updated_by = excluded.updated_by, updated_at = excluded.updated_at`,
        [JSON.stringify(value), by, at],
      );
    },
  };
}
