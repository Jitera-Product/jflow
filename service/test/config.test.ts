import { readFileSync } from 'node:fs';
import { it, expect } from 'vitest';
import { loadConfig } from '../src/config/loadConfig.js';

const example = JSON.parse(readFileSync(new URL('../config.example.json', import.meta.url), 'utf8'));
const env = {
  JFLOW_CONFIG: 'x',
  JFLOW_GATE_SECRET: 'g'.repeat(32),
  JFLOW_CALLBACK_SECRET: 'c'.repeat(32),
  MCP_TOKEN: 'm'.repeat(32),
  DATABASE_URL: 'postgres://u:p@db.example.com/jflow',
  JFLOW_SETTINGS_KEY: 'k'.repeat(32),
};

it('reads the file and the secrets', () => {
  const c = loadConfig(env, () => JSON.stringify(example));
  expect(c.documents).toEqual({ kind: 'jitera', verbs: example.documents.verbs });
  expect(c.databaseUrl).toBe('postgres://u:p@db.example.com/jflow');
  expect(c.settingsKey).toBe('k'.repeat(32));
  expect(c.mcpClients).toEqual([{ name: 'jitera-flow-agent', token: 'm'.repeat(32) }]);
  expect(c.publicUrl).toBe('https://flow.example.com');
  expect(c.port).toBe(8080);
  expect(c.templatesDir).toMatch(/templates$/);
  expect(c.webDir).toMatch(/web\/dist$/);
});
it('names every missing secret in one error', () => {
  expect(() => loadConfig({ JFLOW_CONFIG: 'x' }, () => JSON.stringify(example)))
    .toThrow(/JFLOW_GATE_SECRET.*JFLOW_CALLBACK_SECRET.*DATABASE_URL.*JFLOW_SETTINGS_KEY.*MCP_TOKEN/s);
});
it('DATABASE_URL is required', () => {
  expect(() => loadConfig({ ...env, DATABASE_URL: undefined }, () => JSON.stringify(example))).toThrow(/DATABASE_URL is missing/);
});
it('JFLOW_SETTINGS_KEY must be at least 32 characters', () => {
  expect(() => loadConfig({ ...env, JFLOW_SETTINGS_KEY: 'k'.repeat(31) }, () => JSON.stringify(example)))
    .toThrow(/JFLOW_SETTINGS_KEY must be at least 32/);
});
it('engineers in the file become seedEngineers, lower-cased', () => {
  const c = loadConfig(env, () => JSON.stringify({ ...example, engineers: ['Ken@Example.com', 'mika@example.com'] }));
  expect(c.seedEngineers).toEqual(['ken@example.com', 'mika@example.com']);
  expect(() => loadConfig(env, () => JSON.stringify({ ...example, engineers: [] }))).toThrow();
});
it('LINEAR_API_KEY is no longer read', () => {
  const c = loadConfig({ ...env, LINEAR_API_KEY: undefined }, () => JSON.stringify(example));
  expect(c).not.toHaveProperty('linearApiKey');
});
it('refuses a secret shorter than 32 characters', () => {
  expect(() => loadConfig({ ...env, JFLOW_GATE_SECRET: 'short' }, () => JSON.stringify(example))).toThrow(/JFLOW_GATE_SECRET/);
});
it('refuses an MCP token shorter than 32 characters', () => {
  expect(() => loadConfig({ ...env, MCP_TOKEN: 'short' }, () => JSON.stringify(example))).toThrow(/MCP_TOKEN must be at least 32/);
});
it('refuses two MCP clients with the same token', () => {
  const two = { ...example, mcpClients: [{ name: 'a', tokenEnv: 'MCP_A' }, { name: 'b', tokenEnv: 'MCP_B' }] };
  const t = 'x'.repeat(32);
  expect(() => loadConfig({ ...env, MCP_A: t, MCP_B: t }, () => JSON.stringify(two))).toThrow(/same token/);
  expect(loadConfig({ ...env, MCP_A: t, MCP_B: 'y'.repeat(32) }, () => JSON.stringify(two)).mcpClients).toHaveLength(2);
});
it('refuses a publicUrl with a path, query or hash', () => {
  for (const publicUrl of ['https://flow.example.com/app', 'https://flow.example.com/?a=1', 'https://flow.example.com/#x']) {
    expect(() => loadConfig(env, () => JSON.stringify({ ...example, publicUrl }))).toThrow(/bare origin/);
  }
});
it('lets JFLOW_ACCESS_AUD and JFLOW_ACCESS_TEAM_DOMAIN override the file', () => {
  const c = loadConfig({ ...env, JFLOW_ACCESS_AUD: 'env-aud', JFLOW_ACCESS_TEAM_DOMAIN: 'env.example.com' }, () => JSON.stringify(example));
  expect(c.access).toEqual({ aud: 'env-aud', teamDomain: 'env.example.com' });
});
it('keeps the file access values when the env is unset or empty', () => {
  const c = loadConfig({ ...env, JFLOW_ACCESS_AUD: '', JFLOW_ACCESS_TEAM_DOMAIN: undefined }, () => JSON.stringify(example));
  expect(c.access).toEqual(example.access);
});
it('names the env var when access is missing in both places', () => {
  const noAccess = { ...example, access: {} };
  expect(() => loadConfig(env, () => JSON.stringify(noAccess)))
    .toThrow(/JFLOW_ACCESS_AUD is missing \(or set access\.aud in the config file\).*JFLOW_ACCESS_TEAM_DOMAIN is missing \(or set access\.teamDomain in the config file\)/s);
  const { access: _, ...none } = example;
  expect(() => loadConfig(env, () => JSON.stringify(none))).toThrow(/JFLOW_ACCESS_AUD is missing/);
  expect(loadConfig({ ...env, JFLOW_ACCESS_AUD: 'a', JFLOW_ACCESS_TEAM_DOMAIN: 'b' }, () => JSON.stringify(none)).access).toEqual({ aud: 'a', teamDomain: 'b' });
});
