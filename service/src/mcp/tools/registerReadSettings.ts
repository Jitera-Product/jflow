import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Deps } from '../../feature/types.js';
import { run } from '../run.js';

export function registerReadSettings(server: McpServer, deps: Deps) {
  server.registerTool('read_settings', {
    description: 'Read the team settings: Jitera project for flow documents, TDR folder, product docs to search, compliance to check. An empty value means not set. Call it first.',
  }, () => run(async () => {
    const { tdrFolder, productDocs, compliance } = deps.settings.get();
    return { tdrFolder, productDocs, compliance };
  }));
}
