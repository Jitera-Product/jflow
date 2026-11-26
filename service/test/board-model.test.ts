import { describe, it, expect } from 'vitest';
import { buildStageBoard } from '../src/board/buildStageBoard.js';
import { readStatusFile } from '../src/board/readStatusFile.js';
import type { StatusFile } from '../src/board/types.js';
import type { FlowProject } from '../src/linear/types.js';
import type { GateRow } from '../src/status/stages.js';

const NOW = new Date('2026-11-26T12:00:00.000Z');
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();
const proj = (o: Partial<FlowProject> = {}): FlowProject => ({
  uuid: 'u1', slugId: 's1', identifier: null, name: 'Alpha', url: 'https://linear.app/x/project/alpha-s1', team: 'ENG',
  lead: { name: 'Mika', email: 'mika@x.com' }, flowLabel: 'flow:plan', state: 'started', updatedAt: daysAgo(5), ...o,
});
const gate = (o: Partial<GateRow> = {}): GateRow => ({
  id: 'g1', from: 'flow:spec-review', to: 'flow:tdr', roles: ['owner', 'engineer'], opened: daysAgo(1),
  status: 'open', approvals: [], decidedBy: '', sig: 'x', ...o,
});
const file = (o: Partial<StatusFile> = {}): StatusFile => ({ gates: [], log: [], stage: null, ...o });
const run = (projects: FlowProject[], files: Array<[string, StatusFile | null]> = [], o: Record<string, unknown> = {}) =>
  buildStageBoard({
    projects, files: new Map(files), ids: new Map(), engineers: ['eng@x.com'], viewer: 'nobody@x.com',
    mine: false, filesFailed: false, ...o,
  }, NOW);
const cards = (b: ReturnType<typeof run>) => b.columns.flatMap((c) => c.cards);

describe('readStatusFile', () => {
  const md = `| # | Stage | Status | File | Updated | By |
| --- | --- | --- | --- | --- | --- |
| 1 | Intent | done | 1-intent.md | | |
| 2 | Spec | in progress | 2-spec.md | | |

## Gates

| Gate | From | To | Roles | Opened | Status | Approved by | Decided by | Sig |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| g1 | flow:spec | flow:spec-review | owner | 2026-11-20T00:00:00.000Z | open | | | s |

## Log

- YYYY-MM-DD - <stage> - <who> - <line>
- 2026-11-20 - Spec - Flow agent - drafted - with a dash
- 2026-11-23 - Spec review approved - mika@x.com via jitera
`;
  it('reads stage, gates and log', () => {
    const f = readStatusFile(md);
    expect(f.stage).toBe('Spec');
    expect(f.gates).toHaveLength(1);
    expect(f.log).toEqual([
      { date: '2026-11-20', stage: 'Spec', who: 'Flow agent', text: 'drafted - with a dash' },
      { date: '2026-11-23', stage: 'Spec review', who: 'mika@x.com via jitera', text: '' },
    ]);
  });
  it('gives null stage when nothing is in progress', () => {
    expect(readStatusFile('# x\n').stage).toBeNull();
  });
});

describe('buildStageBoard', () => {
  it('keeps a labeled project without a file in its column, not started, days from updatedAt', () => {
    const b = run([proj()]);
    const plan = b.columns.find((c) => c.stage === 'Plan')!;
    expect(plan.cards).toHaveLength(1);
    expect(plan.cards[0]).toMatchObject({ notStarted: true, behind: false, days: 5, key: 's1', id: null });
    expect(run([proj()], [['s1', null]]).columns.find((c) => c.stage === 'Plan')!.cards[0]!.notStarted).toBe(true);
  });

  it('uses the identifier as key and fills id from ids', () => {
    const c = cards(run([proj({ identifier: 'P-CORE-9' })], [], { ids: new Map([['s1', 'P-CORE-12']]) }))[0]!;
    expect(c).toMatchObject({ key: 'P-CORE-9', id: 'P-CORE-12', slugId: 's1' });
  });

  it('puts a flow:plan project with a Spec review file in Plan and marks it behind', () => {
    const c = cards(run([proj()], [['s1', file({ stage: 'Spec review' })]]))[0]!;
    expect(c).toMatchObject({ stage: 'Plan', behind: true, notStarted: false });
  });

  it('counts days from the last log line of the card stage', () => {
    const log = [
      { date: '2026-11-10', stage: 'Plan', who: 'a', text: '' },
      { date: '2026-11-23', stage: 'Plan', who: 'a', text: '' },
      { date: '2026-11-25', stage: 'Build', who: 'a', text: '' },
    ];
    expect(cards(run([proj()], [['s1', file({ log })]]))[0]!.days).toBe(3);
  });

  it('computes open gate, missing roles and waitsFor from it', () => {
    const g = gate({ approvals: [{ role: 'owner', email: 'mika@x.com' }] });
    const c = cards(run([proj()], [['s1', file({ gates: [g] })]]))[0]!;
    expect(c.openGate).toEqual({ id: 'g1', to: 'flow:tdr', opened: g.opened, missing: ['engineer'] });
    expect(c.waitsFor).toEqual([{ kind: 'engineer', names: ['eng@x.com'] }]);
    const none = cards(run([proj()], [['s1', file({ gates: [g] })]], { engineers: [] }))[0]!;
    expect(none.waitsFor[0]!.names).toEqual(['an engineer']);
  });

  it('ignores closed and malformed gates', () => {
    const gates = [gate({ status: 'approved' }), gate({ id: '' }), gate({ roles: [] })];
    expect(cards(run([proj()], [['s1', file({ gates })]]))[0]!.openGate).toBeNull();
  });

  it('waits by stage when no gate is open', () => {
    const kinds = (label: string) => cards(run([proj({ flowLabel: label })]))[0]!.waitsFor.map((w) => w.kind);
    expect(kinds('flow:intent')).toEqual(['owner']);
    expect(kinds('flow:spec')).toEqual(['agent']);
    expect(kinds('flow:tdr')).toEqual(['engineer']);
    expect(kinds('flow:build')).toEqual(['agent']);
    expect(kinds('flow:done')).toEqual([]);
    expect(cards(run([proj({ flowLabel: 'flow:intent' })]))[0]!.waitsFor[0]!.names).toEqual(['Mika']);
  });

  it('marks a gate opened 4 days ago stuck and counts it', () => {
    const f = file({ gates: [gate({ opened: daysAgo(4) })] });
    const b = run([proj(), proj({ uuid: 'u2', slugId: 's2' })], [['s1', f], ['s2', file({ gates: [gate({ opened: daysAgo(2) })] })]]);
    expect(cards(b).map((c) => c.stuck)).toEqual([true, false]);
    expect(b.stuck).toBe(1);
  });

  it('filters with mine for an owner and for an engineer', () => {
    const projects = [
      proj({ flowLabel: 'flow:intent' }),
      proj({ uuid: 'u2', slugId: 's2', flowLabel: 'flow:tdr', lead: { name: 'Bo', email: 'bo@x.com' } }),
      proj({ uuid: 'u3', slugId: 's3', flowLabel: 'flow:spec' }),
    ];
    const keys = (viewer: string) => cards(run(projects, [], { viewer, mine: true })).map((c) => c.slugId);
    expect(keys('MIKA@x.com')).toEqual(['s1']);
    expect(keys('eng@x.com')).toEqual(['s2']);
    expect(keys('other@x.com')).toEqual([]);
    expect(cards(run(projects, [], { viewer: 'mika@x.com' })).map((c) => c.waitingForMe)).toEqual([true, false, false]);
  });

  it('drops Done cards older than 14 days by the Done log line, else updatedAt', () => {
    const done = (o: Partial<FlowProject>) => proj({ flowLabel: 'flow:done', ...o });
    expect(cards(run([done({ updatedAt: daysAgo(15) })]))).toHaveLength(0);
    expect(cards(run([done({ updatedAt: daysAgo(13) })]))).toHaveLength(1);
    const log = [{ date: '2026-11-11', stage: 'Done', who: 'a', text: '' }];
    expect(cards(run([done({ updatedAt: daysAgo(1) })], [['s1', file({ log })]]))).toHaveLength(0);
  });

  it('sets the notice and ignores files when filesFailed', () => {
    const b = run([proj()], [['s1', file({ stage: 'Spec review', gates: [gate()] })]], { filesFailed: true });
    expect(b.notice).toBe('jflow could not read the status files in Jitera. Stages come from Linear only.');
    expect(cards(b)[0]).toMatchObject({ notStarted: true, behind: false, openGate: null });
    expect(run([proj()]).notice).toBeNull();
  });

  it('skips projects with an unknown flow label', () => {
    expect(cards(run([proj({ flowLabel: 'flow:wat' })]))).toHaveLength(0);
  });

  it('has a column for every stage in order', () => {
    expect(run([]).columns.map((c) => c.stage)).toEqual(['Intent', 'Spec', 'Spec review', 'TDR', 'UI', 'Plan', 'Build', 'Verify', 'Done']);
  });
});
