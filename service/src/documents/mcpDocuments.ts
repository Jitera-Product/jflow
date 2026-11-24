import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { DocumentsConnection, McpVerb } from '../config/types.js';
import { defaultConnect } from './defaultConnect.js';
import { fill } from './fill.js';
import { parseListing } from './parseListing.js';
import { parseReadPage } from './parseReadPage.js';
import type { Documents, ToolResult } from './types.js';

export function mcpDocuments(conn: DocumentsConnection, connect: () => Promise<Client> = () => defaultConnect(conn)): Documents {
  let client: Client | undefined;

  async function call(verb: McpVerb, vars: Record<string, string>): Promise<string> {
    const req = { name: verb.tool, arguments: fill(verb, vars) };
    let res: ToolResult;
    try {
      client ??= await connect();
      res = (await client.callTool(req)) as ToolResult;
    } catch {
      client = undefined; // transport error: reconnect once and retry
      client = await connect();
      res = (await client.callTool(req)) as ToolResult;
    }
    const text = (res.content ?? []).map((c) => c.text ?? '').join('');
    if (res.isError) throw new Error(`documents: ${verb.tool}: ${text}`);
    return text;
  }

  const write = async (verb: McpVerb, path: string, content: string) => {
    const text = await call(verb, { path, content });
    if (text.startsWith('Error')) throw new Error(`documents: ${verb.tool}: ${text}`); // Boost reports write failures as plain text
  };

  return {
    async read(path) {
      const out: string[] = [];
      let from = 1;
      for (;;) {
        const verb = from === 1 ? conn.verbs.read : { ...conn.verbs.read, args: { ...conn.verbs.read.args, line_from: String(from) } };
        const text = await call(verb, { path, content: '' });
        if (text.startsWith('Error')) throw new Error(`documents: ${verb.tool}: ${text}`);
        const page = parseReadPage(text);
        if (page === '' || page === null) return page;
        out.push(page.body);
        if (page.to >= page.total || page.to < from) return out.join('\n');
        from = page.to + 1;
      }
    },
    async list(path) {
      const text = await call(conn.verbs.list, { path, content: '' });
      if (text.startsWith('Error')) throw new Error(`documents: ${conn.verbs.list.tool}: ${text}`);
      return parseListing(text, path);
    },
    create: (path, content) => write(conn.verbs.create, path, content),
    update: (path, content) => write(conn.verbs.update, path, content),
  };
}
