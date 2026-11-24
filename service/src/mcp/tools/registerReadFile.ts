import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { FeatureError } from '../../feature/FeatureError.js';
import { loadFeature } from '../../feature/loadFeature.js';
import type { Deps } from '../../feature/types.js';
import { checkFile } from '../checkFile.js';
import { folderOf } from '../folderOf.js';
import { run } from '../run.js';
import { project } from '../types.js';

export function registerReadFile(server: McpServer, deps: Deps) {
  server.registerTool('read_file', {
    description: 'Read one file of the feature folder. The path is relative to the folder, like 2-spec.md.',
    inputSchema: { project, file: z.string() },
  }, ({ project, file }) => run(async () => {
    checkFile(file);
    const f = await loadFeature(deps, project);
    const content = await deps.docs.read(`${folderOf(f)}/${file}`);
    if (content === null) throw new FeatureError('not_found', file);
    return { file, content };
  }));
}
