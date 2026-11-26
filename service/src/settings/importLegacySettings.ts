import type { Config } from '../config/types.js';
import type { LegacySettings } from './types.js';

export function importLegacySettings(config: Config, env: Record<string, string | undefined>): LegacySettings {
  const legacy: LegacySettings = {};
  if (config.legacy?.engineers?.length) legacy.engineers = config.legacy.engineers;
  if (config.legacy?.publicUrl) legacy.publicUrl = config.legacy.publicUrl;
  if (env.JFLOW_GATE_SECRET) legacy.gateSecret = env.JFLOW_GATE_SECRET;

  const fromFile = [legacy.engineers && 'engineers', legacy.publicUrl && 'publicUrl'].filter(Boolean);
  if (fromFile.length) console.warn(`jflow: imported ${fromFile.join(' and ')} from JFLOW_CONFIG; you can remove JFLOW_CONFIG now`);
  if (legacy.gateSecret) console.warn('jflow: imported the gate secret from JFLOW_GATE_SECRET; you can remove JFLOW_GATE_SECRET now');
  return legacy;
}
