import type pg from 'pg';
import type { PersonalSettingsStore } from './types.js';

export function pgPersonalSettingsStore(db: pg.Pool): PersonalSettingsStore {
  return {
    async github(email) {
      const r = await db.query('select github_token, github_login from personal_settings where email = $1', [email.toLowerCase()]);
      const row = r.rows[0];
      return row ? { token: row.github_token, login: row.github_login } : null;
    },
    async saveGithub(email, github, at) {
      await db.query(
        `insert into personal_settings (email, github_token, github_login, updated_at) values ($1, $2, $3, $4)
         on conflict (email) do update set github_token = excluded.github_token, github_login = excluded.github_login, updated_at = excluded.updated_at`,
        [email.toLowerCase(), github.token, github.login, at],
      );
    },
    async forgetGithub(email) {
      await db.query('delete from personal_settings where email = $1', [email.toLowerCase()]);
    },
  };
}
