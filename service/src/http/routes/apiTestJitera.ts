import type { IncomingMessage, ServerResponse } from 'node:http';
import { z } from 'zod';
import { mcpDocuments } from '../../documents/mcpDocuments.js';
import { isDocsUrl } from '../../settings/isDocsUrl.js';
import { jiteraReason } from '../jiteraReason.js';
import { json } from '../json.js';
import { readJson } from '../readJson.js';
import type { HttpContext } from '../types.js';

const body = z.object({ docsUrl: z.string().trim(), docsToken: z.string().trim().optional() });

export async function apiTestJitera(ctx: HttpContext, req: IncomingMessage, res: ServerResponse) {
  const read = await readJson(req, res);
  if (!read) return;
  const parsed = body.safeParse(read.body);
  if (!parsed.success) return json(res, 400, { error: 'invalid' });
  const { docsUrl } = parsed.data;
  const stored = ctx.deps.settings.get();
  if (!isDocsUrl(docsUrl)) return json(res, 200, { ok: false, message: 'The Jitera MCP URL must be an https URL.' });
  // The stored token only goes to the stored URL: a test must not send it anywhere else.
  const token = parsed.data.docsToken || (docsUrl === stored.docsUrl ? stored.docsToken : '');
  if (!token) return json(res, 200, { ok: false, message: 'Enter the Jitera token.' });
  const make = ctx.opts.makeDocs ?? mcpDocuments;
  try {
    await make({ kind: ctx.deps.config.documents.kind, url: docsUrl, token, headers: {}, verbs: ctx.deps.config.documents.verbs }).list(ctx.deps.config.flowFolder);
    json(res, 200, { ok: true });
  } catch (e) {
    json(res, 200, { ok: false, message: `Could not read the Jitera documents: ${jiteraReason(e, token)}` });
  }
}
