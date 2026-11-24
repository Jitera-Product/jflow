import { z } from 'zod';

const verb = z.object({ tool: z.string(), args: z.record(z.string(), z.string()) });

export const fileSchema = z.object({
  publicUrl: z.string().url().refine((u) => {
    const url = new URL(u);
    return url.pathname === '/' && !url.search && !url.hash;
  }, 'publicUrl must be a bare origin like https://flow.example.com, with no path, query or hash'),
  flowFolder: z.string(),
  templatesDir: z.string().optional(),
  teams: z.array(z.string()),
  engineers: z.array(z.string()),
  access: z.object({ teamDomain: z.string(), aud: z.string() }),
  documents: z.object({
    kind: z.literal('jitera'),
    url: z.string().url(),
    tokenEnv: z.string(),
    headers: z.record(z.string(), z.string()),
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
  flowFolder: string; // 'documents/Flow'
  templatesDir: string; // absolute path to ../templates
  teams: string[]; // Linear team keys opted in
  engineers: string[]; // lowercased emails
  access: { teamDomain: string; aud: string };
  documents: DocumentsConnection;
  linearApiKey: string;
  gateSecret: string;
  callbackSecret: string;
  mcpClients: Array<{ name: string; token: string }>;
};
