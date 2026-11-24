import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import type { DocumentsConnection } from '../config/types.js';

export async function defaultConnect(conn: DocumentsConnection): Promise<Client> {
  const transport = new StreamableHTTPClientTransport(new URL(conn.url), {
    requestInit: { headers: { authorization: 'Bearer ' + conn.token, ...conn.headers } },
  });
  const client = new Client({ name: 'jflow', version: '0.1.0' });
  await client.connect(transport);
  return client;
}
