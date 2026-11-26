import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { loadFeature } from '../../feature/loadFeature.js';
import type { Deps } from '../../feature/types.js';
import { cell } from '../cell.js';
import { folderOf } from '../folderOf.js';
import { inFeatureChat } from '../inFeatureChat.js';
import { run } from '../run.js';
import { project, UI_FILE } from '../types.js';

export function registerSaveUiHandoff(server: McpServer, deps: Deps) {
  server.registerTool('save_ui_handoff', {
    description: 'Write 2-ui/README.md: the design handoff link and one row per screen and state.',
    inputSchema: {
      project, link: z.string().describe('Link to the design handoff'),
      screens: z.array(z.object({ name: z.string(), state: z.string(), file: z.string() })),
    },
  }, async ({ project, link, screens }, extra) => inFeatureChat(deps, project, extra._meta, () => run(async () => {
    const f = await loadFeature(deps, project);
    const path = `${folderOf(f)}/${UI_FILE}`;
    const rows = screens.map((s) => `| ${cell(s.name)} | ${cell(s.state)} | ${cell(s.file)} |`);
    const head = readFileSync(join(deps.config.templatesDir, '2-ui.md'), 'utf8')
      .replaceAll('<PROJECT-ID>', () => f.identifier).replaceAll('<Project name>', () => f.name).replaceAll('<handoff link>', () => cell(link));
    const text = `${head.trimEnd()}\n${rows.join('\n')}${rows.length ? '\n' : ''}`;
    await ((await deps.docs.read(path)) !== null ? deps.docs.update(path, text) : deps.docs.create(path, text));
    return { file: UI_FILE };
  })));
}
