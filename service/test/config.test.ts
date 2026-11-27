import { expect, it } from 'vitest';
import { legacyFileHint } from '../src/config/legacyFileHint.js';
import { loadConfig } from '../src/config/loadConfig.js';

const KEY = 'k'.repeat(32);
const env = { DATABASE_URL: 'postgres://x', JFLOW_SETTINGS_KEY: KEY, JFLOW_ACCESS_TEAM_DOMAIN: 't.cloudflareaccess.com', JFLOW_ACCESS_AUD: 'a' };

it('starts with the four env values and nothing else', () => {
  const c = loadConfig(env);
  expect(c.port).toBe(8080);
  expect(c.flowFolder).toBe('documents/Flow');
  expect(c.documents.verbs.read).toEqual({ tool: 'resource_read', args: { path: '{path}', line_number: '100000' } });
  expect(c.legacy).toBeNull();
  expect(c).not.toHaveProperty('mcpClients');
  expect(c.databaseUrl).toBe('postgres://x');
  expect(c.settingsKey).toBe(KEY);
  expect(c.access).toEqual({ teamDomain: 't.cloudflareaccess.com', aud: 'a' });
  expect(c.templatesDir).toMatch(/templates$/);
  expect(c.webDir).toMatch(/web\/dist$/);
  expect(loadConfig({ ...env, PORT: '9000' }).port).toBe(9000);
});
it('names every missing value', () => {
  expect(() => loadConfig({})).toThrow(/DATABASE_URL is missing.*JFLOW_SETTINGS_KEY is missing.*JFLOW_ACCESS_TEAM_DOMAIN is missing.*JFLOW_ACCESS_AUD is missing/);
});
it('refuses a short settings key', () => {
  expect(() => loadConfig({ ...env, JFLOW_SETTINGS_KEY: 'short' })).toThrow(/JFLOW_SETTINGS_KEY must be at least 32/);
});
it('reads the old file only as legacy, and takes access from it when the env lacks it', () => {
  const file = JSON.stringify({ publicUrl: 'https://flow.example.com/', engineers: ['Ken@x.com'], mcpClients: [{ name: 'agent', tokenEnv: 'MCP_TOKEN' }], access: { teamDomain: 't', aud: 'a' }, documents: {} });
  const c = loadConfig({ DATABASE_URL: 'p', JFLOW_SETTINGS_KEY: KEY, JFLOW_CONFIG: '/c.json', MCP_TOKEN: 'm'.repeat(32) }, () => file);
  expect(c.access).toEqual({ teamDomain: 't', aud: 'a' });
  expect(c.legacy?.engineers).toEqual(['Ken@x.com']);
  expect(c.legacy).not.toHaveProperty('publicUrl');
  expect(c.legacy).not.toHaveProperty('documents');
});
it('the env wins over the access values in the old file', () => {
  const file = JSON.stringify({ access: { teamDomain: 'file', aud: 'file' } });
  expect(loadConfig({ ...env, JFLOW_CONFIG: '/c.json' }, () => file).access).toEqual({ teamDomain: 't.cloudflareaccess.com', aud: 'a' });
});
it('tells when JFLOW_CONFIG can be removed, and what must be set first', () => {
  expect(legacyFileHint(loadConfig(env), env)).toBeNull();
  const file = JSON.stringify({ mcpClients: [{ name: 'agent', tokenEnv: 'MCP_TOKEN' }], access: { teamDomain: 'file', aud: 'file' } });
  const withFile = { ...env, JFLOW_CONFIG: '/c.json' };
  expect(legacyFileHint(loadConfig(withFile, () => file), withFile)).toBe('jflow: you can remove JFLOW_CONFIG and MCP_TOKEN now');
  const accessFromFile = { DATABASE_URL: 'p', JFLOW_SETTINGS_KEY: KEY, JFLOW_ACCESS_AUD: 'a', JFLOW_CONFIG: '/c.json' };
  expect(legacyFileHint(loadConfig(accessFromFile, () => file), accessFromFile)).toBe(
    'jflow: JFLOW_CONFIG still gives the Access values; set JFLOW_ACCESS_TEAM_DOMAIN and JFLOW_ACCESS_AUD before you remove JFLOW_CONFIG and MCP_TOKEN',
  );
  expect(legacyFileHint(loadConfig(withFile, () => '{}'), withFile)).toBe('jflow: you can remove JFLOW_CONFIG now');
});
it('names JFLOW_CONFIG and the path when the old file cannot be read', () => {
  const missing = () => { throw new Error('ENOENT: no such file'); };
  expect(() => loadConfig({ ...env, JFLOW_CONFIG: '/config/config.json' }, missing)).toThrow('JFLOW_CONFIG: cannot read /config/config.json: ENOENT: no such file');
  expect(() => loadConfig({ ...env, JFLOW_CONFIG: '/c.json' }, () => '{nope')).toThrow(/^JFLOW_CONFIG: cannot read \/c\.json: /);
  expect(() => loadConfig({ ...env, JFLOW_CONFIG: '/c.json' }, () => '{"engineers":"x"}')).toThrow(/^JFLOW_CONFIG: cannot read \/c\.json: /);
});
