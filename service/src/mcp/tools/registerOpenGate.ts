import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { Deps } from '../../feature/types.js';
import { openGate } from '../../gates/openGate.js';
import { inFeatureChat } from '../inFeatureChat.js';
import { run } from '../run.js';
import { project } from '../types.js';

export function registerOpenGate(server: McpServer, deps: Deps) {
  server.registerTool('open_gate', {
    description: 'Ask a person to approve the next stage. Returns a link. Only a person can approve; you cannot.',
    inputSchema: { project, to: z.string().describe('The flow label to move to, like flow:plan') },
  }, async ({ project, to }, extra) => inFeatureChat(deps, project, extra._meta, () => run(async () => {
    const g = await openGate(deps, project, to);
    return { ...g, say: `Approve here: ${g.url}` };
  }, (g) => ({ 'jflow/gate': { project: g.project, gate: g.gate, url: g.url, from: g.from, to: g.to } }))));
}
