import { MIN_SECRET } from '../config/minSecret.js';
import type { Config } from '../config/types.js';

export function importLegacyTokens(config: Config, env: Record<string, string | undefined>): Array<{ name: string; token: string }> {
  return (config.legacy?.mcpClients ?? []).flatMap((c) => {
    const token = env[c.tokenEnv];
    if (token && token.length >= MIN_SECRET) return [{ name: c.name, token }];
    console.warn(`jflow: ${c.tokenEnv} is missing or shorter than ${MIN_SECRET} characters; chat client ${c.name} is skipped`);
    return [];
  });
}
