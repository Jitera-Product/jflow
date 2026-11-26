import type { IncomingMessage, ServerResponse } from 'node:http';
import { z } from 'zod';
import { createFlowProject } from '../../linear/createFlowProject.js';
import { findUserByEmail } from '../../linear/findUserByEmail.js';
import { listTeamMembers } from '../../linear/listTeamMembers.js';
import { json } from '../json.js';
import { readJson } from '../readJson.js';
import type { HttpContext } from '../types.js';

const ideaBody = z.object({
  title: z.string().trim().min(1), problem: z.string().trim(), audience: z.string().trim(),
  team: z.string(), ownerId: z.string().trim().optional(),
});

export async function apiIdeas(ctx: HttpContext, req: IncomingMessage, res: ServerResponse, email: string) {
  const { teams, linearApiKey } = ctx.deps.settings.get();
  const f = ctx.opts.fetch ?? fetch;
  try {
    if (req.method === 'GET') {
      const team = new URL(req.url ?? '/', 'http://localhost').searchParams.get('team') ?? '';
      if (!teams.includes(team)) return json(res, 400, { error: 'invalid', message: 'Pick a team.' });
      const [owners, me] = await Promise.all([listTeamMembers(f, linearApiKey, team), findUserByEmail(f, linearApiKey, email)]);
      return json(res, 200, { owners, defaultOwnerId: me?.id ?? null });
    }
    const read = await readJson(req, res);
    if (!read) return;
    const body = ideaBody.safeParse(read.body);
    if (!body.success || !teams.includes(body.data.team)) {
      return json(res, 400, { error: 'invalid', message: 'Give the idea a title and pick a team.' });
    }
    const { title, problem, audience, team, ownerId } = body.data;
    if (!ownerId) return json(res, 400, { error: 'owner_required', message: 'Pick an owner.' });
    const content = `## Problem\n\n${problem}\n\n## Who it is for\n\n${audience}\n`;
    json(res, 200, await createFlowProject(f, linearApiKey, { teamKey: team, name: title, summary: problem, content, leadId: ownerId }));
  } catch {
    json(res, 502, { error: 'linear', message: 'Linear did not answer. Check the key and try again.' });
  }
}
