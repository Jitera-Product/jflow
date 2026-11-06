import { describe, expect, it } from 'vitest';
import { agentState, buildBoard, type BoardInput, type Issue, type Project } from '../src/shared/model.js';

const NOW = Date.parse('2026-11-06T12:00:00Z');
const hoursAgo = (h: number) => new Date(NOW - h * 3600e3).toISOString();

const ann = { id: 'u1', name: 'Ann' };
const bob = { id: 'u2', name: 'Bob' };
const eve = { id: 'u3', name: 'Eve' };

const projects: Project[] = [
  { id: 'p1', name: 'Alpha', url: 'https://l/p1', status: 'In Progress', statusType: 'started', people: [{ ...ann, role: 'lead' }] },
  { id: 'p2', name: 'Beta', url: 'https://l/p2', status: 'Planned', statusType: 'planned', people: [{ ...bob, role: 'member' }] },
];

let seq = 0;
const issue = (o: Partial<Issue>): Issue => ({
  id: `ENG-${++seq}`, title: 't', url: 'u', status: 'In Progress', assignee: ann, project: null, labels: [], updatedAt: hoursAgo(1), completedAt: null, ...o,
});
const closed = (who = ann, labels: string[] = []) => issue({ assignee: who, labels, completedAt: hoursAgo(48) });
const input = (o: Partial<BoardInput>): BoardInput => ({ projects, started: [], todo: [], completed: [], cut: false, ...o });

describe('agentState', () => {
  it('needs agent:ready and exactly one repo label', () => {
    expect(agentState(issue({ labels: ['agent:ready', 'repo:a'] }), NOW)).toBe('ready');
    expect(agentState(issue({ labels: ['agent:ready'] }), NOW)).toBeNull();
    expect(agentState(issue({ labels: ['agent:ready', 'repo:a', 'repo:b'] }), NOW)).toBeNull();
  });
  it('marks agent:working stuck after 24 hours without an update', () => {
    expect(agentState(issue({ labels: ['agent:working'], updatedAt: hoursAgo(2) }), NOW)).toBe('working');
    expect(agentState(issue({ labels: ['agent:working'], updatedAt: hoursAgo(25) }), NOW)).toBe('stuck');
  });
  it('treats agent:review as review', () => {
    expect(agentState(issue({ labels: ['agent:review'] }), NOW)).toBe('review');
  });
});

describe('buildBoard', () => {
  it('shows own projects with counts, other projects grouped, and lists only no-project issues', () => {
    const b = buildBoard(input({
      started: [
        issue({ project: { id: 'p1', name: 'Alpha' } }),
        issue({ project: { id: 'p1', name: 'Alpha' } }),
        issue({ project: { id: 'p2', name: 'Beta' } }),
        issue({ project: { id: 'p9', name: 'Fixes' } }),
        issue({ project: null, title: 'loose' }),
      ],
    }), NOW);
    const card = b.people.find((p) => p.person.id === 'u1');
    expect(card?.ownProjects).toEqual([expect.objectContaining({ name: 'Alpha', role: 'lead', count: 2 })]);
    expect(card?.otherProjects).toEqual([
      { name: 'Beta', kind: 'other_board_project', count: 1 },
      { name: 'Fixes', kind: 'off_board_project', count: 1 },
    ]);
    expect(card?.noProject.map((x) => x.issue.title)).toEqual(['loose']);
    expect(card?.outsideCount).toBe(3);
    expect(b.summary).toMatchObject({ people: 2, active: 5, offBoard: 3, noProject: 1 });
  });

  it('moves agent-ready issues to the agent lane and out of the human outside work', () => {
    const b = buildBoard(input({
      started: [issue({ labels: ['agent:ready', 'repo:a'] }), issue({})],
      todo: [issue({ labels: ['agent:ready', 'repo:a'] })],
    }), NOW);
    const card = b.people.find((p) => p.person.id === 'u1');
    expect(card?.agent.map((a) => a.state)).toEqual(['ready', 'ready']);
    expect(card?.bar).toEqual({ own: 0, outside: 1, ready: 2 });
    expect(card?.noProject).toHaveLength(1);
    expect(b.summary.agentReady).toBe(2);
  });

  it('keeps agent-held issues out of the person load, but counts stuck runs back in', () => {
    const b = buildBoard(input({
      started: [issue({ labels: ['agent:working'] }), issue({ labels: ['agent:review'] }), issue({ labels: ['agent:working'], updatedAt: hoursAgo(30) })],
      completed: [closed(), closed(), closed()],
    }), NOW);
    const card = b.people.find((p) => p.person.id === 'u1');
    expect(card?.outsideCount).toBe(1);
    expect(card?.noProject).toEqual([expect.objectContaining({ stuck: true })]);
    expect(card?.forecast).toMatchObject({ kind: 'ok', queue: 1 });
    expect(b.summary.agentReview).toBe(1);
  });

  it('forecasts queue / closures per week and leaves agent closures out of the pace', () => {
    const b = buildBoard(input({
      started: [issue({ project: { id: 'p1', name: 'Alpha' } }), issue({})],
      todo: [issue({}), issue({})],
      completed: [closed(), closed(), closed(), closed(), closed(), closed(), closed(ann, ['agent:handled', 'agent:review'])],
    }), NOW);
    const f = b.people.find((p) => p.person.id === 'u1')?.forecast;
    expect(f).toEqual({ kind: 'ok', queue: 4, perWeek: 2, weeks: 2 });
  });

  it('shows no forecast with too few closures or cut data', () => {
    const few = buildBoard(input({ started: [issue({})], completed: [closed(), closed()] }), NOW);
    expect(few.people.find((p) => p.person.id === 'u1')?.forecast).toEqual({ kind: 'few', closures: 2 });
    const cut = buildBoard(input({ started: [issue({})], completed: [closed(), closed(), closed()], cut: true }), NOW);
    expect(cut.people.find((p) => p.person.id === 'u1')?.forecast).toEqual({ kind: 'cut' });
  });

  it('lists people with active issues who are not on the board', () => {
    const b = buildBoard(input({ started: [issue({ assignee: eve }), issue({ assignee: eve, project: { id: 'p1', name: 'Alpha' } })] }), NOW);
    expect(b.notOnBoard).toEqual([{ person: eve, issues: 2, noProject: 1 }]);
  });
});
