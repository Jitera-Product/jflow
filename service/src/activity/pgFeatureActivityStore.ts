import type pg from 'pg';
import type { FeatureActivityStore } from './types.js';

export function pgFeatureActivityStore(db: pg.Pool): FeatureActivityStore {
  return {
    async touch(feature, at) {
      await db.query(
        `insert into feature_activity (feature, last_tool_at) values ($1, $2)
         on conflict (feature) do update set last_tool_at = greatest(feature_activity.last_tool_at, excluded.last_tool_at)`,
        [feature, at],
      );
    },
    async since(at) {
      const r = await db.query('select feature from feature_activity where last_tool_at >= $1', [at]);
      return r.rows.map((row) => row.feature);
    },
  };
}
