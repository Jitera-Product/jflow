export type McpVerb = { tool: string; args: Record<string, string> }; // arg values may hold {path} and {content}
export type DocumentsConnection = {
  kind: 'jitera';
  url: string;
  token: string;
  headers: Record<string, string>;
  verbs: { read: McpVerb; list: McpVerb; create: McpVerb; update: McpVerb };
};
export type LegacyFile = {
  engineers?: string[];
  mcpClients?: Array<{ name: string; tokenEnv: string }>;
  access?: { teamDomain?: string; aud?: string };
};
export type Config = {
  port: number;
  flowFolder: string;
  templatesDir: string;
  webDir: string;
  agentFile: string;
  access: { teamDomain: string; aud: string };
  documents: Pick<DocumentsConnection, 'kind' | 'verbs'>; // url, project and token come from the settings
  databaseUrl: string;
  settingsKey: string;
  legacy: LegacyFile | null;
};
