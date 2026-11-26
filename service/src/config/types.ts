import { z } from 'zod';

const verb = z.object({ tool: z.string(), args: z.record(z.string(), z.string()) });

export const fileSchema = z.object({
  publicUrl: z.string().url().refine((u) => {
    const url = new URL(u);
    return url.pathname === '/' && !url.search && !url.hash;
  }, 'publicUrl must be a bare origin like https://flow.example.com, with no path, query or hash'),
  flowFolder: z.string(),
  templatesDir: z.string().optional(),
  webDir: z.string().optional(),
  engineers: z.array(z.string()).min(1), // seed for the first start; later the settings in the database rule
  access: z.object({ teamDomain: z.string().optional(), aud: z.string().optional() }).optional(),
  documents: z.object({
    kind: z.literal('jitera'),
    verbs: z.object({ read: verb, list: verb, create: verb, update: verb }),
  }),
  mcpClients: z.array(z.object({ name: z.string(), tokenEnv: z.string() })),
});

export type McpVerb = { tool: string; args: Record<string, string> }; // arg values may hold {path} and {content}
export type DocumentsConnection = {
  kind: 'jitera';
  url: string;
  token: string;
  headers: Record<string, string>;
  verbs: { read: McpVerb; list: McpVerb; create: McpVerb; update: McpVerb };
};
export type Config = {
  port: number;
  publicUrl: string; // no trailing slash
  flowFolder: string;
  templatesDir: string;
  webDir: string;
  seedEngineers: string[];
  access: { teamDomain: string; aud: string };
  documents: Pick<DocumentsConnection, 'kind' | 'verbs'>; // url, project and token come from the settings
  databaseUrl: string;
  settingsKey: string;
  gateSecret: string;
  mcpClients: Array<{ name: string; token: string }>;
};
