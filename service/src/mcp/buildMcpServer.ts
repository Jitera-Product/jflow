import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { Deps } from '../feature/types.js';
import { registerLogStage } from './tools/registerLogStage.js';
import { registerOpenGate } from './tools/registerOpenGate.js';
import { registerReadFeature } from './tools/registerReadFeature.js';
import { registerReadFile } from './tools/registerReadFile.js';
import { registerReadSettings } from './tools/registerReadSettings.js';
import { registerSaveUiHandoff } from './tools/registerSaveUiHandoff.js';
import { registerSetStage } from './tools/registerSetStage.js';
import { registerStartFeature } from './tools/registerStartFeature.js';
import { registerWriteFile } from './tools/registerWriteFile.js';

export function buildMcpServer(deps: Deps, client: string): McpServer {
  const by = `Flow agent (${client})`;
  const server = new McpServer({ name: 'jflow', version: '0.1.0' });
  registerReadSettings(server, deps);
  registerReadFeature(server, deps);
  registerStartFeature(server, deps, by);
  registerReadFile(server, deps);
  registerWriteFile(server, deps);
  registerLogStage(server, deps, by);
  registerSetStage(server, deps, by);
  registerOpenGate(server, deps);
  registerSaveUiHandoff(server, deps);
  return server;
}
