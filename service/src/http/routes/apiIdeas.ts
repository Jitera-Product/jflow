import type { IncomingMessage, ServerResponse } from 'node:http';
import { z } from 'zod';
import { createFlowProject } from '../../linear/createFlowProject.js';
import { findUserByEmail } from '../../linear/findUserByEmail.js';
import { listTeamMembers } from '../../linear/listTeamMembers.js';
import { json } from '../json.js';
import { readJson } from '../readJson.js';
import type { HttpContext } from '../types.js';

const ideaBody = z.object({
  title: z.string().trim().min(1).max(255), problem: z.string().trim().max(5000), audience: z.string().trim().max(2000),
  team: z.string(), ownerId: z.string().trim().optional(),
});

export async function apiIdeas(ctx: HttpContext, req: IncomingMessage, res: ServerResponse, email: string) {
  const { teams, linearApiKey } = ctx.deps.settings.get();
  const f = ctx.opts.fetch ?? fetch;
  try {
    if (req.method === 'GET') {
      const team = new URL(req.url ?? '/', 'http://localhost').searchParams.get('team') ?? '';
      if (!teams.includes(team)) return json(res, 400, { error: 'invalid', message: 'Pick a team.' });
      const [owners, me] = await Promise.all([listTeamMembers(f, linearApiKey, team), findUserByEmail(f, linearApiKey, email).catch(() => null)]);
      return json(res, 200, { owners, defaultOwnerId: owners.some((o) => o.id === me?.id) ? me!.id : null });
    }
    if (!ctx.origin()) return json(res, 409, { error: 'no_public_url', message: 'An engineer has to set the jflow address on /settings first.' });
    const read = await readJson(req, res);
    if (!read) return;
    const body = ideaBody.safeParse(read.body);
    if (!body.success || !teams.includes(body.data.team)) {
      const problems = body.success ? ['team: not picked'] : [...new Set(body.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`))];
      return json(res, 400, { error: 'invalid', message: 'Give the idea a title and pick a team.', problems });
    }
    const { title, problem, audience, team, ownerId } = body.data;
    if (!ownerId) return json(res, 400, { error: 'owner_required', message: 'Pick an owner.' });
    const members = await listTeamMembers(f, linearApiKey, team);
    if (!members.some((m) => m.id === ownerId)) {
      return json(res, 400, { error: 'invalid', message: 'Pick an owner from this team.', problems: ['owner: not a member of this team'] });
    }
    const content = `## Problem\n\n${problem}\n\n## Who it is for\n\n${audience}\n`;
    let created;
    try {
      created = await createFlowProject(f, linearApiKey, { teamKey: team, name: title, summary: problem, content, leadId: ownerId });
    } catch {
      return json(res, 502, { error: 'linear', message: 'Linear refused the project. Try again or check the title and owner.' });
    }
    json(res, 200, created);
  } catch {
    json(res, 502, { error: 'linear', message: 'Linear did not answer. Check the key and try again.' });
  }
}
