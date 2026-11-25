import type { IncomingMessage, ServerResponse } from 'node:http';
import { z } from 'zod';
import { decideGate } from '../../gates/decideGate.js';
import { gateData } from '../gateData.js';
import { json } from '../json.js';
import { known } from '../known.js';
import { readJson } from '../readJson.js';
import type { HttpContext } from '../types.js';

const decisionBody = z.object({ decision: z.enum(['approve', 'changes']), to: z.string() });

export async function apiGate(ctx: HttpContext, req: IncomingMessage, res: ServerResponse, email: string, project: string, gate: string) {
  const { deps } = ctx;
  try {
    if (req.method === 'POST') {
      const read = await readJson(req, res);
      if (!read) return;
      const body = decisionBody.safeParse(read.body);
      if (!body.success) return json(res, 400, { error: 'invalid', message: 'Send a decision (approve or changes) and the move it is for.' });
      await decideGate(deps, { project, gate, email, decision: body.data.decision, channel: 'page', expectedTo: body.data.to });
    }
    json(res, 200, await gateData(deps, project, gate, email));
  } catch (e) {
    if (!known(e)) throw e;
    json(res, e.code === 'not_found' ? 404 : 409, { error: e.code, message: e.message });
  }
}
