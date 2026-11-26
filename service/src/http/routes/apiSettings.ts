import type { IncomingMessage, ServerResponse } from 'node:http';
import { z } from 'zod';
import { createFlowLabels } from '../../linear/createFlowLabels.js';
import { bareOrigin } from '../../settings/bareOrigin.js';
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
  teams: list((s) => s.toUpperCase()),
  engineers: list((s) => s.toLowerCase()),
  docsToken: secret,
  linearApiKey: secret,
  publicUrl: z.string().trim().optional(),
  tdrFolder: z.string().trim().optional(), // missing = keep the stored value
  flowAgentUrl: z.string().trim().optional(), // missing = keep the stored value
});

export async function apiSettings(ctx: HttpContext, req: IncomingMessage, res: ServerResponse, email: string) {
  const live = ctx.deps.settings;
  if (req.method === 'GET') return json(res, 200, settingsView(email, live.get()));

  const read = await readJson(req, res);
  if (!read) return;
  const body = settingsBody.safeParse(read.body);
  if (!body.success) {
    return json(res, 400, { error: 'invalid', problems: body.error.issues.map((i) => `${i.path.join('.') || 'body'}: ${i.message}`) });
  }
  const from = header(req, 'origin');
  if (body.data.publicUrl && bareOrigin(body.data.publicUrl) !== from) {
    return json(res, 400, { error: 'invalid', problems: ['Open /settings at that address to set it.'] });
  }
  try {
    const publicUrl = body.data.publicUrl || (ctx.origin() === '' ? from : undefined);
    await live.save({ ...body.data, publicUrl }, email);
  } catch (e) {
    if (e instanceof SettingsError) return json(res, 400, { error: 'invalid', problems: e.problems });
    throw e;
  }
  console.log(`jflow: settings saved by ${email}`);
  const key = live.get().linearApiKey;
  if (key) {
    try {
      const created = await createFlowLabels(ctx.opts.fetch ?? fetch, key);
      if (created.length) console.log(`jflow: created Linear project labels ${created.join(', ')}`);
    } catch (e) {
      console.warn(`jflow: could not create the Linear flow labels (${e instanceof Error ? e.message : String(e)}); check that the key can create project labels`);
    }
  }
  json(res, 200, settingsView(email, live.get()));
}
