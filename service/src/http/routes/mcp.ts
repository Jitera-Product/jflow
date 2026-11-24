import type { IncomingMessage, ServerResponse } from 'node:http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { Deps } from '../../feature/types.js';
import { buildMcpServer } from '../../mcp/buildMcpServer.js';
import { header } from '../header.js';
import { json } from '../json.js';
import { readBody } from '../readBody.js';
import { same } from '../same.js';
import { send } from '../send.js';
import { tooLarge } from '../tooLarge.js';

export async function mcp(deps: Deps, req: IncomingMessage, res: ServerResponse) {
  const token = /^Bearer (.+)$/.exec(header(req, 'authorization') ?? '')?.[1];
  const client = token ? deps.config.mcpClients.find((c) => same(c.token, token)) : undefined;
  if (!client) return send(res, 401, 'unauthorized');
  const raw = await readBody(req);
  if (!raw) return tooLarge(res);
  let body: unknown;
  try {
    body = JSON.parse(raw.toString('utf8'));
  } catch {
    return json(res, 400, { jsonrpc: '2.0', error: { code: -32700, message: 'Parse error' }, id: null });
  }
  const server = buildMcpServer(deps, client.name);
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  res.on('close', () => {
    void transport.close();
    void server.close();
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, body);
}
