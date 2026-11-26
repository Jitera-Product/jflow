import type { IncomingMessage, ServerResponse } from 'node:http';
import { z } from 'zod';
import { SettingsError } from '../../settings/SettingsError.js';
import { header } from '../header.js';
import { json } from '../json.js';
import { readJson } from '../readJson.js';
import { settingsView } from '../settingsView.js';
import type { HttpContext } from '../types.js';

const list = (fix: (s: string) => string) => z.array(z.string()).transform((a) => [...new Set(a.map((s) => fix(s.trim())).filter(Boolean))]);
const secret = z.string().trim().optional().transform((s) => s || undefined); // blank = keep the stored one

const settingsBody = z.object({
  docsUrl: z.string().trim(),
  jiteraProject: z.string().trim(),
  teams: list((s) => s.toUpperCase()),
  engineers: list((s) => s.toLowerCase()),
  docsToken: secret,
  linearApiKey: secret,
  publicUrl: z.string().trim().optional(),
  tdrFolder: z.string().trim().optional(), // missing = keep the stored value
  productDocs: z.string().trim().optional(),
  compliance: z.string().trim().optional(),
});

export async function apiSettings(ctx: HttpContext, req: IncomingMessage, res: ServerResponse, email: string) {
  const live = ctx.deps.settings;
  if (live.get().engineers.length === 0 && (await live.claimFirstEngineer(email))) {
    console.log(`jflow: ${email} is the first engineer`);
  }
  if (!live.get().engineers.includes(email)) {
    return json(res, 403, { error: 'not_allowed', message: 'Only jflow engineers can open settings. Ask an engineer to add you.' });
  }
  if (req.method === 'GET') return json(res, 200, settingsView(email, live.get()));

  const read = await readJson(req, res);
  if (!read) return;
  const body = settingsBody.safeParse(read.body);
  if (!body.success) {
    return json(res, 400, { error: 'invalid', problems: body.error.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`) });
  }
  try {
    const publicUrl = body.data.publicUrl || (ctx.origin() === '' ? header(req, 'origin') : undefined);
    await live.save({ ...body.data, publicUrl }, email);
  } catch (e) {
    if (e instanceof SettingsError) return json(res, 400, { error: 'invalid', problems: e.problems });
    throw e;
  }
  console.log(`jflow: settings saved by ${email}`);
  json(res, 200, settingsView(email, live.get()));
}
