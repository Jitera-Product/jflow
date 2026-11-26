import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { loadFeature } from '../../feature/loadFeature.js';
import type { Deps } from '../../feature/types.js';
import { folderOf } from '../folderOf.js';
import { Refusal } from '../Refusal.js';
import { inFeatureChat } from '../inFeatureChat.js';
import { run } from '../run.js';
import { project, UI_FILE } from '../types.js';

const STAGE_FILES = ['1-intent.md', '2-spec.md', '3-plan.md', '2-ui/README.md'];

export function registerWriteFile(server: McpServer, deps: Deps) {
  server.registerTool('write_file', {
    description: 'Write a stage file: 1-intent.md, 2-spec.md, 3-plan.md or 2-ui/README.md. Creates it or replaces it.',
    inputSchema: { project, file: z.string(), content: z.string() },
  }, async ({ project, file, content }, extra) => inFeatureChat(deps, project, extra._meta, () => run(async () => {
    if (!STAGE_FILES.includes(file)) throw new Refusal(`write_file: ${file} is not a stage file`);
    const f = await loadFeature(deps, project);
    const path = `${folderOf(f)}/${file}`;
    const exists = file === UI_FILE ? (await deps.docs.read(path)) !== null : f.files.includes(file);
    await (exists ? deps.docs.update(path, content) : deps.docs.create(path, content));
    return { file, created: !exists };
  })));
}
