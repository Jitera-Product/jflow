import { z } from 'zod';
import type { LegacyFile } from './types.js';

const legacySchema = z.object({
  publicUrl: z.string().optional(),
  engineers: z.array(z.string()).optional(),
  mcpClients: z.array(z.object({ name: z.string(), tokenEnv: z.string() })).optional(),
  access: z.object({ teamDomain: z.string().optional(), aud: z.string().optional() }).optional(),
});

export function readLegacyFile(path: string | undefined, readFile: (p: string) => string): LegacyFile | null {
  if (!path) return null;
  return legacySchema.parse(JSON.parse(readFile(path)));
}
