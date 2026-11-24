import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Client } from '@modelcontextprotocol/sdk/client/index.js';
import type { DocumentsConnection } from '../src/config/types.js';
import { mcpDocuments } from '../src/documents/mcpDocuments.js';
import { memoryDocuments } from '../src/documents/memoryDocuments.js';

const fixture = (n: string) => readFileSync(new URL(`./fixtures/${n}`, import.meta.url), 'utf8');
const FILE = fixture('jitera-read-file.txt');
const DIR = fixture('jitera-read-dir.txt');

const CONN: DocumentsConnection = {
  kind: 'jitera',
  url: 'https://example.com/mcp',
  token: 't',
  headers: {},
  verbs: {
    read: { tool: 'resource_read', args: { path: '{path}', line_number: '100000' } },
    list: { tool: 'resource_read', args: { path: '{path}' } },
    create: { tool: 'resource_write', args: { path: '{path}', content: '{content}', operation: 'create' } },
    update: { tool: 'resource_write', args: { path: '{path}', content: '{content}', operation: 'update' } },
  },
};

type Call = { name: string; arguments: Record<string, string> };
function fakeClient(calls: Call[], reply: string | ((c: Call) => string), isError = false) {
  const client = {
    async callTool(c: Call) {
      calls.push(c);
      return { content: [{ type: 'text', text: typeof reply === 'string' ? reply : reply(c) }], isError };
    },
  };
  return async () => client as unknown as Client;
}

// Same format as jitera-read-file.txt: header, <jtr_block>, raw lines.
const page = (lines: string[], from: number, to: number, total: number) =>
  `\`a.md#L${from}-L${to}\` (Total lines: ${total}, ID: u1)\n<jtr_block>\n${lines.slice(from - 1, to).join('\n')}\n</jtr_block>`;
const LINES = Array.from({ length: 400 }, (_, i) => `line ${i + 1}`);

describe('mcpDocuments', () => {
  it('maps verbs to tool calls with the path and content filled in', async () => {
    const calls: Call[] = [];
    const docs = mcpDocuments(CONN, fakeClient(calls, 'Updated document at documents/Flow/P-ENG-12 X/2-spec.md'));
    await docs.update('documents/Flow/P-ENG-12 X/2-spec.md', '# Spec $& {path}');
    expect(calls).toEqual([
      { name: 'resource_write', arguments: { path: 'documents/Flow/P-ENG-12 X/2-spec.md', content: '# Spec $& {path}', operation: 'update' } },
    ]);
  });

  it('strips the header and block markers from a recorded file', async () => {
    const docs = mcpDocuments(CONN, fakeClient([], FILE));
    expect(await docs.read('x.md')).toBe('# P-ENG-12 Export audit log\n\nStage: Spec\n| Intent | done |\n| Spec | in progress |');
  });

  it('returns the whole 400 line file as plain text', async () => {
    const docs = mcpDocuments(CONN, fakeClient([], page(LINES, 1, 400, 400)));
    expect((await docs.read('a.md'))!.split('\n')).toHaveLength(400);
  });

  it('pages with line_from until the whole file is read', async () => {
    const calls: Call[] = [];
    const reply = (c: Call) => {
      const from = Number(c.arguments.line_from ?? 1);
      return page(LINES, from, Math.min(from + 300, 400), 400); // Boost returns line_number + 1 lines per page
    };
    const docs = mcpDocuments(CONN, fakeClient(calls, reply));
    const text = (await docs.read('a.md'))!;
    expect(text.split('\n')).toEqual(LINES);
    expect(calls.map((c) => c.arguments.line_from)).toEqual([undefined, '302']);
  });

  it('parses a folder listing', async () => {
    const docs = mcpDocuments(CONN, fakeClient([], DIR));
    expect(await docs.list('documents/Flow/')).toEqual(['P-ENG-12 Export audit log/', 'P-ENG-15 Billing export/', 'README.md']);
  });

  it('refuses a cut off folder listing', async () => {
    const cut = DIR.replace('  P-ENG-15 Billing export/ (2 files)\n', '  P-ENG-15 Billing export/ (2 files)\n  ... and 40 more\n');
    await expect(mcpDocuments(CONN, fakeClient([], cut)).list('documents/Flow'))
      .rejects.toThrow('documents: list: listing of documents/Flow is incomplete');
    const note = DIR.replace('Open a file', 'Listing may be incomplete.\nOpen a file');
    await expect(mcpDocuments(CONN, fakeClient([], note)).list('documents/Flow'))
      .rejects.toThrow('documents: list: listing of documents/Flow is incomplete');
  });

  it('returns null for a missing file', async () => {
    const docs = mcpDocuments(CONN, fakeClient([], 'No document found at: documents/Flow/nope.md'));
    expect(await docs.read('documents/Flow/nope.md')).toBeNull();
  });

  it('reads an empty document as an empty string', async () => {
    const docs = mcpDocuments(CONN, fakeClient([], 'a.md (empty document)'));
    expect(await docs.read('a.md')).toBe('');
  });

  it('throws on an isError result and on a plain Error text from a write', async () => {
    await expect(mcpDocuments(CONN, fakeClient([], 'boom', true)).read('a.md')).rejects.toThrow('documents: resource_read: boom');
    await expect(mcpDocuments(CONN, fakeClient([], 'Error: No document found at a.md. Provide uuid or correct path.')).update('a.md', 'x')).rejects.toThrow(
      'documents: resource_write: Error: No document found',
    );
  });

  it('reconnects once after a transport error', async () => {
    let connects = 0;
    const good = { callTool: async () => ({ content: [{ type: 'text', text: FILE }] }) };
    const bad = { callTool: async () => { throw new Error('socket closed'); } };
    const docs = mcpDocuments(CONN, async () => (++connects === 1 ? bad : good) as unknown as Client);
    expect(await docs.read('a.md')).toContain('Stage: Spec');
    expect(connects).toBe(2);
  });
});

describe('memoryDocuments', () => {
  const docs = () => memoryDocuments({ 'documents/Flow/P-ENG-12 X/0-status.md': 's', 'documents/Flow/P-ENG-12 X/2-ui/README.md': 'u', 'documents/Flow/README.md': 'r' });
  it('reads, lists direct children, and guards create and update', async () => {
    const d = docs();
    expect(await d.read('documents/Flow/README.md')).toBe('r');
    expect(await d.read('documents/Flow/nope.md')).toBeNull();
    expect(await d.list('documents/Flow/')).toEqual(['P-ENG-12 X/', 'README.md']);
    expect(await d.list('documents/Flow/P-ENG-12 X/')).toEqual(['0-status.md', '2-ui/']);
    await expect(d.create('documents/Flow/README.md', 'x')).rejects.toThrow();
    await expect(d.update('documents/Flow/new.md', 'x')).rejects.toThrow();
    await d.create('documents/Flow/new.md', 'n');
    await d.update('documents/Flow/new.md', 'n2');
    expect(await d.read('documents/Flow/new.md')).toBe('n2');
  });
});
