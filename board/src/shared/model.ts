// Team workload board: pure computation from Linear data to what the page shows.
// No I/O here, so every rule is unit-tested in test/model.test.ts.

export type Person = { id: string; name: string };

export type Project = {
  id: string;
  name: string;
  url: string;
  status: string;
  statusType: string;
  people: Array<Person & { role: 'lead' | 'member' }>;
};

export type Issue = {
  id: string; // Linear identifier, e.g. ENG-123
  title: string;
  url: string;
  status: string;
  assignee: Person | null;
  project: { id: string; name: string } | null;
  labels: string[];
  updatedAt: string;
  completedAt: string | null;
};

export type BoardInput = {
  projects: Project[];
  started: Issue[];
  todo: Issue[];
  completed: Issue[];
  cut: boolean; // a source stopped at the page limit
};

export type Settings = {
  paceDays: number;
  minClosures: number;
  stuckHours: number;
};

export const DEFAULT_SETTINGS: Settings = { paceDays: 21, minClosures: 3, stuckHours: 24 };

export type AgentState = 'ready' | 'working' | 'review' | 'stuck';
export type OutsideKind = 'no_project' | 'off_board_project' | 'other_board_project';

export type Forecast =
  | { kind: 'ok'; weeks: number; queue: number; perWeek: number }
  | { kind: 'few'; closures: number }
  | { kind: 'cut' };

export type PersonCard = {
  person: Person;
  ownProjects: Array<{ id: string; name: string; url: string; status: string; statusType: string; role: 'lead' | 'member'; count: number }>;
  otherProjects: Array<{ name: string; kind: Exclude<OutsideKind, 'no_project'>; count: number }>;
  noProject: Array<{ issue: Issue; stuck: boolean }>;
  agent: Array<{ issue: Issue; state: AgentState }>;
  bar: { own: number; outside: number; ready: number };
  outsideCount: number;
  forecast: Forecast;
};

export type Board = {
  summary: { people: number; active: number; offBoard: number; noProject: number; share: number; agentReady: number; agentReview: number };
  people: PersonCard[];
  notOnBoard: Array<{ person: Person; issues: number; noProject: number }>;
  settings: Settings;
};

const has = (i: Issue, label: string): boolean => i.labels.includes(label);
const repoLabels = (i: Issue): number => i.labels.filter((l) => l.startsWith('repo:')).length;

export function agentState(i: Issue, now: number, s: Settings = DEFAULT_SETTINGS): AgentState | null {
  if (has(i, 'agent:review')) return 'review';
  if (has(i, 'agent:working')) return now - Date.parse(i.updatedAt) > s.stuckHours * 3600e3 ? 'stuck' : 'working';
  if (has(i, 'agent:ready') && repoLabels(i) === 1) return 'ready';
  return null;
}

const agentHeld = (st: AgentState | null): boolean => st === 'working' || st === 'review';

export function buildBoard(input: BoardInput, now: number, s: Settings = DEFAULT_SETTINGS): Board {
  const own = new Map<string, Set<string>>();
  const names = new Map<string, Person>();
  const onBoard = new Set<string>();
  for (const p of input.projects) {
    onBoard.add(p.id);
    for (const person of p.people) {
      names.set(person.id, { id: person.id, name: person.name });
      if (!own.has(person.id)) own.set(person.id, new Set());
      own.get(person.id)?.add(p.id);
    }
  }

  const seen = new Set<string>();
  const open = [...input.started, ...input.todo].filter((i) => !seen.has(i.id) && seen.add(i.id));
  const kindOf = (i: Issue): OutsideKind => (!i.project ? 'no_project' : onBoard.has(i.project.id) ? 'other_board_project' : 'off_board_project');

  const people: PersonCard[] = [...own].map(([pid, projectIds]) => {
    const person = names.get(pid) ?? { id: pid, name: pid };
    const startedMine = input.started.filter((i) => i.assignee?.id === pid);
    const openMine = open.filter((i) => i.assignee?.id === pid);
    const isOwn = (i: Issue): boolean => !!i.project && projectIds.has(i.project.id);

    const ownProjects = input.projects
      .filter((p) => projectIds.has(p.id))
      .map((p) => {
        const role = p.people.find((x) => x.id === pid)?.role ?? 'member';
        return { id: p.id, name: p.name, url: p.url, status: p.status, statusType: p.statusType, role, count: startedMine.filter((i) => i.project?.id === p.id).length };
      })
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    const outsideStarted = startedMine.filter((i) => !isOwn(i));
    const otherMap = new Map<string, { name: string; kind: Exclude<OutsideKind, 'no_project'>; count: number }>();
    for (const i of outsideStarted) {
      if (!i.project || agentHeld(agentState(i, now, s))) continue;
      const k = kindOf(i) as Exclude<OutsideKind, 'no_project'>;
      const cur = otherMap.get(i.project.id) ?? { name: i.project.name, kind: k, count: 0 };
      cur.count++;
      otherMap.set(i.project.id, cur);
    }
    const otherProjects = [...otherMap.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    const agent = openMine
      .filter((i) => !isOwn(i))
      .map((i) => ({ issue: i, state: agentState(i, now, s) }))
      .filter((x): x is { issue: Issue; state: AgentState } => x.state !== null);
    const ready = agent.filter((x) => x.state === 'ready');

    const noProject = outsideStarted
      .filter((i) => !i.project)
      .map((i) => ({ issue: i, state: agentState(i, now, s) }))
      .filter((x) => x.state !== 'ready' && !agentHeld(x.state))
      .map((x) => ({ issue: x.issue, stuck: x.state === 'stuck' }));

    const readyStarted = ready.filter((x) => startedMine.some((i) => i.id === x.issue.id)).length;
    const outsideHuman = outsideStarted.filter((i) => !agentHeld(agentState(i, now, s))).length - readyStarted;
    const ownStarted = startedMine.filter(isOwn).length;

    const queue = openMine.filter((i) => !agentHeld(agentState(i, now, s))).length;
    const closures = input.completed.filter((i) => i.assignee?.id === pid && !has(i, 'agent:review')).length;
    let forecast: Forecast;
    if (input.cut) forecast = { kind: 'cut' };
    else if (closures < s.minClosures) forecast = { kind: 'few', closures };
    else {
      const perWeek = closures / (s.paceDays / 7);
      forecast = { kind: 'ok', weeks: queue / perWeek, queue, perWeek };
    }

    return {
      person,
      ownProjects,
      otherProjects,
      noProject,
      agent,
      bar: { own: ownStarted, outside: Math.max(0, outsideHuman), ready: ready.length },
      outsideCount: outsideStarted.filter((i) => !agentHeld(agentState(i, now, s))).length,
      forecast,
    };
  });

  people.sort((a, b) => b.outsideCount - a.outsideCount || b.bar.own - a.bar.own || a.person.name.localeCompare(b.person.name));

  const boardStarted = input.started.filter((i) => i.assignee && own.has(i.assignee.id));
  const offBoard = boardStarted.filter((i) => !(i.project && own.get(i.assignee?.id ?? '')?.has(i.project.id)));
  const active = boardStarted.length;

  const others = new Map<string, { person: Person; issues: number; noProject: number }>();
  for (const i of input.started) {
    if (!i.assignee || own.has(i.assignee.id)) continue;
    const r = others.get(i.assignee.id) ?? { person: i.assignee, issues: 0, noProject: 0 };
    r.issues++;
    if (!i.project) r.noProject++;
    others.set(i.assignee.id, r);
  }

  return {
    summary: {
      people: people.length,
      active,
      offBoard: offBoard.length,
      noProject: offBoard.filter((i) => !i.project).length,
      share: active ? offBoard.length / active : 0,
      agentReady: people.reduce((n, p) => n + p.bar.ready, 0),
      agentReview: open.filter((i) => has(i, 'agent:review')).length,
    },
    people,
    notOnBoard: [...others.values()].sort((a, b) => b.issues - a.issues),
    settings: s,
  };
}
