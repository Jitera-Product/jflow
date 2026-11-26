import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Deps } from '../../feature/types.js';
import { run } from '../run.js';

export function registerReadSettings(server: McpServer, deps: Deps) {
  server.registerTool('read_settings', {
    description: 'Read the team settings: the TDR folder. An empty value means use the CLAUDE.md line or the default.',
  }, () => run(async () => {
    const { tdrFolder } = deps.settings.get();
    return { tdrFolder };
  }));
}
