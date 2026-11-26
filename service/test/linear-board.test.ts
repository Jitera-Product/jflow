import { describe, it, expect } from 'vitest';
import { listFlowProjects } from '../src/linear/listFlowProjects.js';
import { listTeamMembers } from '../src/linear/listTeamMembers.js';
import { findUserByEmail } from '../src/linear/findUserByEmail.js';
import { createFlowProject } from '../src/linear/createFlowProject.js';

type Body = { query: string; variables: any };
type Answer = unknown | ((b: Body) => unknown);
function fakeFetch(answers: Record<string, Answer>, bodies: Body[] = []): typeof fetch {
  return (async (_url: any, init: any) => {
    const body = JSON.parse(init.body) as Body;
    bodies.push(body);
    const op = /(?:query|mutation)\s+(\w+)/.exec(body.query)![1]!;
    const a = answers[op];
    if (a === undefined) throw new Error(`unexpected op ${op}`);
    return new Response(JSON.stringify(typeof a === 'function' ? a(body) : a), { status: 200 });
  }) as typeof fetch;
}

const node = (o: any) => ({
  id: 'u1', slugId: 's1', name: 'N', url: 'https://linear.app/x', updatedAt: '2026-11-20T00:00:00Z',
  status: { type: 'started' }, lead: { name: 'Ken', email: 'Ken@X.com' },
  teams: { nodes: [{ key: 'CORE' }] }, labels: { nodes: [{ name: 'flow:spec' }] }, ...o,
});

it('queries sized for the live API', async () => {
  const bodies: Body[] = [];
  await listFlowProjects(fakeFetch({ BoardProjects: { data: { projects: { pageInfo: { hasNextPage: false, endCursor: null }, nodes: [] } } } }, bodies), 'k', ['CORE']);
  await listTeamMembers(fakeFetch({ BoardTeamMembers: { data: { teams: { nodes: [] } } } }, bodies), 'k', 'CORE');
  expect(bodies[0]!.query).toContain('projects(first: 50');
  expect(bodies[0]!.query).toContain('teams(first: 5)');
  expect(bodies[0]!.query).toContain('labels(first: 10)');
  expect(bodies[1]!.query).toContain('members(first: 100)');
});

describe('listFlowProjects', () => {
  it('maps fields, pages, drops unlabelled and canceled', async () => {
    const bodies: Body[] = [];
    const pages = [
      { data: { projects: { pageInfo: { hasNextPage: true, endCursor: 'c1' }, nodes: [node({}), node({ id: 'u2', labels: { nodes: [{ name: 'bug' }] } })] } } },
      { data: { projects: { pageInfo: { hasNextPage: false, endCursor: null }, nodes: [node({ id: 'u3', status: { type: 'canceled' } }), node({ id: 'u4', lead: null })] } } },
    ];
    const out = await listFlowProjects(fakeFetch({ BoardProjects: () => pages.shift() }, bodies), 'k', ['CORE']);
    expect(out.map((p) => p.uuid)).toEqual(['u1', 'u4']);
    expect(out[0]).toEqual({
      uuid: 'u1', slugId: 's1', identifier: null, name: 'N', url: 'https://linear.app/x', team: 'CORE',
      lead: { name: 'Ken', email: 'ken@x.com' }, flowLabel: 'flow:spec', state: 'started', updatedAt: '2026-11-20T00:00:00Z',
    });
    expect(out[1]!.lead).toBeNull();
    expect(bodies[1]!.variables.after).toBe('c1');
  });
});

it('listTeamMembers drops inactive users', async () => {
  const m = (id: string, active: boolean) => ({ id, name: id, email: id + '@x.com', active });
  const out = await listTeamMembers(fakeFetch({ BoardTeamMembers: { data: { teams: { nodes: [{ members: { nodes: [m('a', true), m('b', false)] } }] } } } }), 'k', 'CORE');
  expect(out).toEqual([{ id: 'a', name: 'a', email: 'a@x.com' }]);
});

describe('findUserByEmail', () => {
  const f = (nodes: any[]) => fakeFetch({ BoardUserByEmail: { data: { users: { nodes } } } });
  it('matches case-insensitively', async () => {
    expect(await findUserByEmail(f([{ id: 'k', name: 'Ken', email: 'ken@x.com' }]), 'k', 'Ken@X.com')).toEqual({ id: 'k', name: 'Ken' });
  });
  it('returns null for none', async () => {
    expect(await findUserByEmail(f([]), 'k', 'no@x.com')).toBeNull();
  });
});

describe('createFlowProject', () => {
  const input = { teamKey: 'CORE', name: 'Idea', summary: 'd', content: '# Md', leadId: 'lead1' };
  const created = { data: { projectCreate: { project: { id: 'u9', slugId: 's9', url: 'https://linear.app/p' } } } };
  it('sends team, name, description, lead and the intent label id', async () => {
    const bodies: Body[] = [];
    const f = fakeFetch({
      BoardCreateLookup: { data: { teams: { nodes: [{ id: 't1' }] }, projectLabels: { nodes: [{ id: 'l1', name: 'flow:intent' }] } } },
      BoardProjectCreate: created,
    }, bodies);
    expect(await createFlowProject(f, 'k', input)).toEqual({ uuid: 'u9', slugId: 's9', url: 'https://linear.app/p' });
    expect(bodies.at(-1)!.variables.input).toEqual({ name: 'Idea', description: 'd', content: '# Md', teamIds: ['t1'], leadId: 'lead1', labelIds: ['l1'] });
  });
  it('cuts the summary to 255 characters on one line, content stays Markdown', async () => {
    const bodies: Body[] = [];
    const f = fakeFetch({
      BoardCreateLookup: { data: { teams: { nodes: [{ id: 't1' }] }, projectLabels: { nodes: [{ id: 'l1', name: 'flow:intent' }] } } },
      BoardProjectCreate: created,
    }, bodies);
    await createFlowProject(f, 'k', { ...input, summary: 'a\n\nb ' + 'x'.repeat(400), content: 'line1\n\nline2' });
    const sent = bodies.at(-1)!.variables.input;
    expect(sent.description).toHaveLength(255);
    expect(sent.description).not.toContain('\n');
    expect(sent.description.startsWith('a b x')).toBe(true);
    expect(sent.content).toBe('line1\n\nline2');
  });
  it('creates the label in the flow group first when missing', async () => {
    const bodies: Body[] = [];
    const f = fakeFetch({
      BoardCreateLookup: { data: { teams: { nodes: [{ id: 't1' }] }, projectLabels: { nodes: [] } } },
      FlowProjectLabels: { data: { projectLabels: { nodes: [{ name: 'flow:spec', parent: { id: 'g1' } }] } } },
      CreateFlowLabel: { data: { projectLabelCreate: { projectLabel: { id: 'new1' } } } },
      BoardProjectCreate: created,
    }, bodies);
    await createFlowProject(f, 'k', input);
    expect(bodies.find((b) => b.query.includes('CreateFlowLabel'))!.variables).toEqual({ name: 'flow:intent', parentId: 'g1' });
    expect(bodies.at(-1)!.variables.input.labelIds).toEqual(['new1']);
  });
});
