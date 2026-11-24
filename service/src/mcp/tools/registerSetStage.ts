import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { day } from '../../feature/day.js';
import { loadFeature } from '../../feature/loadFeature.js';
import type { Deps } from '../../feature/types.js';
import { AGENT_MOVES } from '../../gates/moves.js';
import { stageOf } from '../../gates/stageOf.js';
import { appendLog } from '../../status/appendLog.js';
import { setStage } from '../../status/setStage.js';
import { Refusal } from '../Refusal.js';
import { run } from '../run.js';
import { statusOf } from '../statusOf.js';
import { project } from '../types.js';

export function registerSetStage(server: McpServer, deps: Deps, by: string) {
  server.registerTool('set_stage', {
    description: 'Move the flow label where the agent may move it (none to flow:intent, flow:spec to flow:spec-review). Other moves need open_gate.',
    inputSchema: { project, to: z.string().describe('A flow label, like flow:spec-review') },
  }, ({ project, to }) => run(async () => {
    const f = await loadFeature(deps, project);
    const from = f.flowLabel ?? '';
    const allowed = AGENT_MOVES[from] ?? [];
    if (!allowed.includes(to)) {
      throw new Refusal(`set_stage: ${from || 'none'} -> ${to} is not an agent move. Allowed: ${allowed.join(', ') || 'none'}. Gates go through open_gate.`);
    }
    const { path } = statusOf(f);
    const date = day(deps);
    await deps.tracker.setFlowLabel(f.id, to);

    let md = (await deps.docs.read(path)) ?? '';
    if (from) md = setStage(md, stageOf(from), 'done', date, by);
    md = setStage(md, stageOf(to), 'in progress', date, by);
    md = appendLog(md, `${date} - ${stageOf(to)} - ${by} - stage set to ${to}`);
    await deps.docs.update(path, md);
    return { from, to };
  }));
}
