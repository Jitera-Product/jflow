import type { Config } from './types.js';

export function legacyFileHint(config: Config, env: Record<string, string | undefined>): string | null {
  if (!config.legacy) return null;
  const files = ['JFLOW_CONFIG', ...(config.legacy.mcpClients ?? []).map((c) => c.tokenEnv)].join(' and ');
  if (env.JFLOW_ACCESS_TEAM_DOMAIN && env.JFLOW_ACCESS_AUD) return `jflow: you can remove ${files} now`;
  return `jflow: JFLOW_CONFIG still gives the Access values; set JFLOW_ACCESS_TEAM_DOMAIN and JFLOW_ACCESS_AUD before you remove ${files}`;
}
