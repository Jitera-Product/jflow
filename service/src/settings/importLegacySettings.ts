import type { Config } from '../config/types.js';
import type { LegacySettings } from './types.js';

export function importLegacySettings(config: Config, env: Record<string, string | undefined>): LegacySettings {
  const legacy: LegacySettings = {};
  if (config.legacy?.engineers?.length) legacy.engineers = config.legacy.engineers;
  if (env.JFLOW_GATE_SECRET) legacy.gateSecret = env.JFLOW_GATE_SECRET;
  return legacy;
}
