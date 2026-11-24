import { readFileSync } from 'node:fs';
import { it, expect } from 'vitest';
import { linearTracker } from '../src/linear/linearTracker.js';

const FIXTURE = JSON.parse(readFileSync(new URL('./fixtures/linear-project.json', import.meta.url), 'utf8'));

type Body = { query: string; variables: any };
// Answers by operation name; records every request body.
function fakeFetch(answers: Record<string, unknown>, bodies: Body[] = []): typeof fetch {
  return (async (_url: any, init: any) => {
    const body = JSON.parse(init.body) as Body;
    bodies.push(body);
    const op = /(?:query|mutation)\s+(\w+)/.exec(body.query)![1]!;
    const answer = answers[op];
    if (answer === undefined) throw new Error(`unexpected op ${op}`);
    return new Response(JSON.stringify(answer), { status: 200 });
  }) as typeof fetch;
}

it('reads lead, teams and the one flow label', async () => {
  const bodies: Body[] = [];
  const p = await linearTracker('k', fakeFetch({ FlowProject: FIXTURE }, bodies)).getProject('p-core-396');
  expect(p).toMatchObject({
    identifier: 'P-CORE-396', teams: ['ENG'], flowLabel: 'flow:spec-review', lead: { name: 'Mika', email: 'mika@jitera.com' },
  });
  expect(bodies[0]!.variables).toEqual({ id: 'p-core-396' });
});

it('a URL ref returns null without a request', async () => {
  const bodies: Body[] = [];
  const t = linearTracker('k', fakeFetch({}, bodies));
  expect(await t.getProject('https://linear.app/x/project/export-audit-log-abc123')).toBeNull();
  expect(await t.getProject('abc123def456')).toBeNull();
  expect(bodies).toEqual([]);
});

it('returns null when Linear does not find the project, throws on other errors', async () => {
  const nf = { data: null, errors: [{ message: 'Entity not found: Project' }] };
  expect(await linearTracker('k', fakeFetch({ FlowProject: nf })).getProject('P-ENG-1')).toBeNull();
  expect(await linearTracker('k', fakeFetch({ FlowProject: { data: { project: null } } })).getProject('P-ENG-1')).toBeNull();
  const bad = { data: null, errors: [{ message: 'boom' }] };
  await expect(linearTracker('k', fakeFetch({ FlowProject: bad })).getProject('P-ENG-1')).rejects.toThrow(/boom/);
});

const withLabels = (nodes: unknown[]) => ({ data: { project: { labels: { nodes } } } });
const labelLookup = (nodes: unknown[]) => ({ data: { projectLabels: { nodes } } });
const updated = { data: { projectUpdate: { success: true } } };

it('swaps flow labels and keeps the others', async () => {
  const bodies: Body[] = [];
  await linearTracker('k', fakeFetch({
    ProjectLabelIds: withLabels([
      { id: 'label-design', name: 'design' },
      { id: 'label-flow-spec', name: 'flow:spec' },
      { id: 'label-flow-tdr', name: 'flow:tdr' },
    ]),
    FlowLabel: labelLookup([{ id: 'label-flow-plan' }]),
    SetProjectLabels: updated,
  }, bodies)).setFlowLabel('p1', 'flow:plan');
  const last = bodies.at(-1)!;
  expect(last.variables.id).toBe('p1');
  expect(last.variables.input.labelIds.sort()).toEqual(['label-design', 'label-flow-plan']);
  expect(bodies.find((b) => b.query.includes('projectLabels'))!.variables.name).toBe('flow:plan');
});

it('throws when the label does not exist in the workspace', async () => {
  const bodies: Body[] = [];
  await expect(linearTracker('k', fakeFetch({
    ProjectLabelIds: withLabels([]), FlowLabel: labelLookup([]), SetProjectLabels: updated,
  }, bodies)).setFlowLabel('p1', 'flow:ui')).rejects.toThrow(/flow:ui/);
  expect(bodies.some((b) => b.query.includes('projectUpdate'))).toBe(false);
});
