import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { fileSchema, type Config } from './types.js';

const MIN_SECRET = 32;

export function loadConfig(
  env: Record<string, string | undefined>,
  readFile: (p: string) => string = (p) => readFileSync(p, 'utf8'),
): Config {
  const file = fileSchema.parse(JSON.parse(readFile(env.JFLOW_CONFIG ?? '')));

  const problems: string[] = [];
  const secret = (name: string, minLength = 1): string => {
    const v = env[name];
    if (!v) problems.push(`${name} is missing`);
    else if (v.length < minLength) problems.push(`${name} must be at least ${minLength} characters`);
    return v ?? '';
  };

  const access = (envName: string, fileKey: 'aud' | 'teamDomain'): string => {
    const v = env[envName] || file.access?.[fileKey];
    if (!v) problems.push(`${envName} is missing (or set access.${fileKey} in the config file)`);
    return v ?? '';
  };

  const aud = access('JFLOW_ACCESS_AUD', 'aud');
  const teamDomain = access('JFLOW_ACCESS_TEAM_DOMAIN', 'teamDomain');
  const gateSecret = secret('JFLOW_GATE_SECRET', MIN_SECRET);
  const databaseUrl = secret('DATABASE_URL');
  const settingsKey = secret('JFLOW_SETTINGS_KEY', MIN_SECRET);
  const mcpClients = file.mcpClients.map((c) => ({ name: c.name, token: secret(c.tokenEnv, MIN_SECRET) }));
  const tokens = mcpClients.map((c) => c.token).filter(Boolean);
  if (new Set(tokens).size !== tokens.length) problems.push('two mcpClients have the same token');

  if (problems.length) throw new Error(`Bad config: ${problems.join('; ')}`);

  return {
    port: Number(env.PORT ?? 8080),
    publicUrl: file.publicUrl.replace(/\/+$/, ''),
    flowFolder: file.flowFolder,
    templatesDir: file.templatesDir ?? fileURLToPath(new URL('../../../templates', import.meta.url)),
    webDir: file.webDir ?? fileURLToPath(new URL('../../../web/dist', import.meta.url)),
    seedEngineers: file.engineers.map((e) => e.toLowerCase()),
    access: { teamDomain, aud },
    documents: { kind: file.documents.kind, verbs: file.documents.verbs },
    databaseUrl,
    settingsKey,
    gateSecret,
    mcpClients,
  };
}
