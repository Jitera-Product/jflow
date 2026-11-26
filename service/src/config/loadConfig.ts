import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { DEFAULT_VERBS } from './defaultVerbs.js';
import { readLegacyFile } from './readLegacyFile.js';
import type { Config } from './types.js';

const MIN_SECRET = 32;

export function loadConfig(
  env: Record<string, string | undefined>,
  readFile: (p: string) => string = (p) => readFileSync(p, 'utf8'),
): Config {
  const legacy = readLegacyFile(env.JFLOW_CONFIG, readFile);

  const problems: string[] = [];
  const need = (name: string, fallback?: string, minLength = 1): string => {
    const v = env[name] || fallback;
    if (!v) problems.push(`${name} is missing`);
    else if (v.length < minLength) problems.push(`${name} must be at least ${minLength} characters`);
    return v ?? '';
  };

  const databaseUrl = need('DATABASE_URL');
  const settingsKey = need('JFLOW_SETTINGS_KEY', undefined, MIN_SECRET);
  const teamDomain = need('JFLOW_ACCESS_TEAM_DOMAIN', legacy?.access?.teamDomain);
  const aud = need('JFLOW_ACCESS_AUD', legacy?.access?.aud);
  if (problems.length) throw new Error(`Bad config: ${problems.join('; ')}`);

  const mcpClients = (legacy?.mcpClients ?? []).flatMap((c) => {
    const token = env[c.tokenEnv];
    if (token && token.length >= MIN_SECRET) return [{ name: c.name, token }];
    console.warn(`jflow: ${c.tokenEnv} is missing or shorter than ${MIN_SECRET} characters; chat client ${c.name} is skipped`);
    return [];
  });

  return {
    port: Number(env.PORT || 8080),
    flowFolder: 'documents/Flow',
    templatesDir: fileURLToPath(new URL('../../../templates', import.meta.url)),
    webDir: fileURLToPath(new URL('../../../web/dist', import.meta.url)),
    access: { teamDomain, aud },
    documents: { kind: 'jitera', verbs: DEFAULT_VERBS },
    databaseUrl,
    settingsKey,
    legacy,
    mcpClients,
  };
}
