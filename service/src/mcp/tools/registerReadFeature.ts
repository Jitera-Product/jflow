import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { loadFeature } from '../../feature/loadFeature.js';
import type { Deps } from '../../feature/types.js';
import { readGates } from '../../status/readGates.js';
import { inFeatureChat } from '../inFeatureChat.js';
import { run } from '../run.js';
import { project } from '../types.js';

export function registerReadFeature(server: McpServer, deps: Deps) {
  server.registerTool('read_feature', {
    description: 'Read a feature: its Linear project, flow label, folder, files, 0-status.md and open gates.',
    inputSchema: { project },
  }, async ({ project }, extra) => inFeatureChat(deps, project, extra._meta, () => run(async () => {
    const f = await loadFeature(deps, project);
    const gates = readGates(f.status ?? '').map(({ sig: _sig, ...g }) => g);
    return { ...f, gates };
  })));
}
