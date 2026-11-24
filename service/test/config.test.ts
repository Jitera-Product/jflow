import { readFileSync } from 'node:fs';
import { it, expect } from 'vitest';
import { loadConfig } from '../src/config/loadConfig.js';

const example = JSON.parse(readFileSync(new URL('../config.example.json', import.meta.url), 'utf8'));
const env = {
  JFLOW_CONFIG: 'x',
  LINEAR_API_KEY: 'lin_api_key',
  JFLOW_GATE_SECRET: 'g'.repeat(32),
  JFLOW_CALLBACK_SECRET: 'c'.repeat(32),
  DOCS_TOKEN: 'doc-token',
  MCP_TOKEN: 'm'.repeat(32),
};

it('reads the file and the secrets', () => {
  const c = loadConfig(env, () => JSON.stringify(example));
  expect(c.engineers).toEqual(['ken@jitera.com']);
  expect(c.documents.token).toBe('doc-token');
  expect(c.mcpClients).toEqual([{ name: 'jitera-flow-agent', token: 'm'.repeat(32) }]);
  expect(c.publicUrl).toBe('https://flow.example.com');
  expect(c.port).toBe(8080);
  expect(c.templatesDir).toMatch(/templates$/);
});
it('names every missing secret in one error', () => {
  expect(() => loadConfig({ JFLOW_CONFIG: 'x' }, () => JSON.stringify(example)))
    .toThrow(/LINEAR_API_KEY.*JFLOW_GATE_SECRET.*JFLOW_CALLBACK_SECRET.*DOCS_TOKEN.*MCP_TOKEN/s);
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
