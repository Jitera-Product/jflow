import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { day } from '../../feature/day.js';
import { loadFeature } from '../../feature/loadFeature.js';
import type { Deps } from '../../feature/types.js';
import { appendLog } from '../../status/appendLog.js';
import { setStage } from '../../status/setStage.js';
import { STAGES } from '../../status/stages.js';
import { run } from '../run.js';
import { statusOf } from '../statusOf.js';
import { project } from '../types.js';

const STATUSES = ['not started', 'in progress', 'done', 'skipped'] as const;

export function registerLogStage(server: McpServer, deps: Deps, by: string) {
  server.registerTool('log_stage', {
    description: 'Set the status of a stage in 0-status.md and add one log line.',
    inputSchema: { project, stage: z.enum(STAGES), status: z.enum(STATUSES), note: z.string().describe('One line, no "|"') },
  }, ({ project, stage, status, note }) => run(async () => {
    const { path } = statusOf(await loadFeature(deps, project));
    const date = day(deps);
    const md = (await deps.docs.read(path)) ?? '';
    await deps.docs.update(path, appendLog(setStage(md, stage, status, date, by), `${date} - ${stage} - ${by} - ${note}`));
    return { ok: true };
  }));
}
