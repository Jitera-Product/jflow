import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { startFeature } from '../../feature/startFeature.js';
import type { Deps } from '../../feature/types.js';
import { inFeatureChat } from '../inFeatureChat.js';
import { run } from '../run.js';
import { project } from '../types.js';

export function registerStartFeature(server: McpServer, deps: Deps, by: string) {
  server.registerTool('start_feature', {
    description: 'Create the flow folder for a project (status and intent files) and set flow:intent. Safe to call again.',
    inputSchema: { project },
  }, async ({ project }, extra) => inFeatureChat(deps, project, extra._meta, () => run(() => startFeature(deps, project, by))));
}
