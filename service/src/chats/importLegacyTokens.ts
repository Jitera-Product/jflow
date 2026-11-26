import type { Config } from '../config/types.js';

const MIN_TOKEN = 32;

export function importLegacyTokens(config: Config, env: Record<string, string | undefined>): Array<{ name: string; token: string }> {
  return (config.legacy?.mcpClients ?? []).flatMap((c) => {
    const token = env[c.tokenEnv];
    if (token && token.length >= MIN_TOKEN) return [{ name: c.name, token }];
    console.warn(`jflow: ${c.tokenEnv} is missing or shorter than ${MIN_TOKEN} characters; chat client ${c.name} is skipped`);
    return [];
  });
}
