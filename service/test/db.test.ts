import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { migrate } from '../src/db/migrate.js';
import { pgSettingsStore } from '../src/settings/pgSettingsStore.js';

const url = process.env.TEST_DATABASE_URL;
if (process.env.CI && !url) throw new Error('TEST_DATABASE_URL must be set in CI');

describe.skipIf(!url)('migrate', () => {
  let admin: pg.Pool;
  let pool: pg.Pool;
  let schema: string;

  beforeEach(async () => {
    schema = `t_${randomBytes(6).toString('hex')}`;
    admin = new pg.Pool({ connectionString: url, max: 1 });
    await admin.query(`create schema ${schema}`);
    pool = new pg.Pool({ connectionString: url, options: `-c search_path=${schema}` });
  });

  afterEach(async () => {
    await pool.end();
    await admin.query(`drop schema ${schema} cascade`);
    await admin.end();
  });

  const fixtures = (files: Record<string, string>) => {
    const dir = mkdtempSync(join(tmpdir(), 'jflow-migrations-'));
    for (const [name, sql] of Object.entries(files)) writeFileSync(join(dir, name), sql);
    return dir;
  };

  it('applies every file once, in name order', async () => {
    const dir = fixtures({
      '002_b.sql': 'create table b (x int)',
      '001_a.sql': 'create table a (x int)',
    });
    expect(await migrate(pool, dir)).toEqual(['001_a.sql', '002_b.sql']);
    await pool.query('select * from a');
    await pool.query('select * from b');
    expect(await migrate(pool, dir)).toEqual([]);
  });

  it('rolls back a failing file and does not record it', async () => {
    const dir = fixtures({
      '001_ok.sql': 'create table ok (x int)',
      '002_bad.sql': 'create table c (x int); select nope;',
    });
    await expect(migrate(pool, dir)).rejects.toThrow('002_bad.sql');
    await expect(pool.query('select * from c')).rejects.toThrow();
    const rows = (await pool.query('select name from schema_migrations')).rows;
    expect(rows).toEqual([{ name: '001_ok.sql' }]);

    writeFileSync(join(dir, '002_bad.sql'), 'create table c (x int)');
    expect(await migrate(pool, dir)).toEqual(['002_bad.sql']);
  });

  it('ships the settings table', async () => {
    await migrate(pool, fileURLToPath(new URL('../migrations', import.meta.url)));
    await expect(pool.query(`insert into settings values (2, '{}', 'x', now())`)).rejects.toThrow();
    await pool.query(`insert into settings values (1, '{}', 'x', now())`);
  });

  it('pgSettingsStore load is null on an empty table, save then load round-trips, a second save replaces the row', async () => {
    await migrate(pool, fileURLToPath(new URL('../migrations', import.meta.url)));
    const store = pgSettingsStore(pool);
    expect(await store.load()).toBeNull();
    const value = { docsUrl: '', jiteraProject: 'p', docsToken: '', linearApiKey: '', teams: ['CORE'], engineers: ['a@x.com'] };
    const at = new Date('2026-11-25T00:00:00Z');
    await store.save(value, 'a@x.com', at);
    expect(await store.load()).toEqual({ value, updatedBy: 'a@x.com', updatedAt: at });
    const next = { ...value, teams: [] };
    await store.save(next, 'b@x.com', new Date('2026-11-26T00:00:00Z'));
    expect((await store.load())?.value).toEqual(next);
    expect((await pool.query('select count(*)::int as n from settings')).rows[0].n).toBe(1);
  });
});
