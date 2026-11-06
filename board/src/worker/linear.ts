// Linear GraphQL client: reads the board's projects and the issues the model needs.
// Pages through every result on the server; stops at MAX_PAGES and reports `cut`.

import type { BoardInput, Issue, Person, Project } from '../shared/model.js';

const ENDPOINT = 'https://api.linear.app/graphql';
const PAGE = 250;
const MAX_PAGES = 20;

type Page<T> = { nodes: T[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } };

type LinearUser = { id: string; name: string; displayName: string | null; email: string | null };
type LinearProject = {
  id: string;
  name: string;
  url: string;
  status: { name: string; type: string } | null;
  lead: LinearUser | null;
  members: { nodes: LinearUser[] };
};
type LinearIssue = {
  identifier: string;
  title: string;
  url: string;
  updatedAt: string;
  completedAt: string | null;
  state: { name: string } | null;
  assignee: LinearUser | null;
  project: { id: string; name: string } | null;
  labels: { nodes: Array<{ name: string }> };
};

const USER = 'id name displayName email';

const PROJECT_FIELDS = `nodes { id name url status { name type } lead { ${USER} } members(first: 100) { nodes { ${USER} } } }
      pageInfo { hasNextPage endCursor }`;

const PROJECTS_QUERY = `query BoardProjects($filter: ProjectFilter, $after: String) {
  projects(first: 50, after: $after, filter: $filter) {
    ${PROJECT_FIELDS}
  }
}`;

const OPTIONS_QUERY = `query BoardOptions {
  teams(first: 250) { nodes { id name key } }
  projectStatuses(first: 50) { nodes { id name type position } }
}`;

const ISSUES_QUERY = `query BoardIssues($filter: IssueFilter, $after: String) {
  issues(first: ${PAGE}, after: $after, filter: $filter) {
    nodes {
      identifier title url updatedAt completedAt
      state { name }
      assignee { ${USER} }
      project { id name }
      labels(first: 50) { nodes { name } }
    }
    pageInfo { hasNextPage endCursor }
  }
}`;

async function gql<T>(apiKey: string, query: string, variables: Record<string, unknown>): Promise<T> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: apiKey },
    body: JSON.stringify({ query, variables }),
  });
  const body = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
  if (!res.ok || body.errors?.length || !body.data) {
    const msg = body.errors?.map((e) => e.message).join('; ') || `HTTP ${res.status}`;
    throw new Error(`Linear: ${msg}`);
  }
  return body.data;
}

async function all<T>(fetchPage: (after: string | null) => Promise<Page<T>>): Promise<{ nodes: T[]; cut: boolean }> {
  const nodes: T[] = [];
  let after: string | null = null;
  for (let n = 0; n < MAX_PAGES; n++) {
    const page: Page<T> = await fetchPage(after);
    nodes.push(...page.nodes);
    if (!page.pageInfo.hasNextPage) return { nodes, cut: false };
    after = page.pageInfo.endCursor;
  }
  return { nodes, cut: true };
}

const person = (u: LinearUser): Person => ({ id: u.id, name: u.displayName || u.name || u.email || u.id });

const toIssue = (i: LinearIssue): Issue => ({
  id: i.identifier,
  title: i.title,
  url: i.url,
  status: i.state?.name ?? '',
  assignee: i.assignee ? person(i.assignee) : null,
  project: i.project,
  labels: i.labels.nodes.map((l) => l.name),
  updatedAt: i.updatedAt,
  completedAt: i.completedAt,
});

const toProject = (p: LinearProject): Project => {
  const people = new Map<string, Person & { role: 'lead' | 'member' }>();
  for (const m of p.members.nodes) people.set(m.id, { ...person(m), role: 'member' });
  if (p.lead) people.set(p.lead.id, { ...person(p.lead), role: 'lead' });
  return { id: p.id, name: p.name, url: p.url, status: p.status?.name ?? '', statusType: p.status?.type ?? '', people: [...people.values()] };
};

export type FilterOptions = {
  teams: Array<{ id: string; name: string; key: string }>;
  statuses: Array<{ id: string; name: string; type: string }>;
};

export async function fetchFilterOptions(apiKey: string): Promise<FilterOptions> {
  const d = await gql<{
    teams: { nodes: Array<{ id: string; name: string; key: string }> };
    projectStatuses: { nodes: Array<{ id: string; name: string; type: string; position: number }> };
  }>(apiKey, OPTIONS_QUERY, {});
  return {
    teams: [...d.teams.nodes].sort((x, y) => x.name.localeCompare(y.name)),
    statuses: [...d.projectStatuses.nodes].sort((x, y) => x.position - y.position).map(({ id, name, type }) => ({ id, name, type })),
  };
}

export type FetchOptions = { apiKey: string; teams: string[]; statuses: string[]; window: string; paceDays: number };

const projectFilter = (o: FetchOptions): Record<string, unknown> => ({
  status: o.statuses.length ? { id: { in: o.statuses } } : { type: { nin: ['completed', 'canceled'] } },
  ...(o.teams.length ? { accessibleTeams: { some: { id: { in: o.teams } } } } : {}),
});

export async function fetchBoardInput(o: FetchOptions): Promise<BoardInput> {
  const issues = (filter: Record<string, unknown>) =>
    all<LinearIssue>(async (after) => (await gql<{ issues: Page<LinearIssue> }>(o.apiKey, ISSUES_QUERY, { filter, after })).issues);

  const [projects, started, todo, completed] = await Promise.all([
    all<LinearProject>(async (after) => (await gql<{ projects: Page<LinearProject> }>(o.apiKey, PROJECTS_QUERY, { filter: projectFilter(o), after })).projects),
    issues({ state: { type: { eq: 'started' } }, updatedAt: { gt: o.window } }),
    issues({ state: { type: { eq: 'unstarted' } } }),
    issues({ completedAt: { gt: `-P${o.paceDays}D` } }),
  ]);

  return {
    projects: projects.nodes.map(toProject),
    started: started.nodes.map(toIssue),
    todo: todo.nodes.map(toIssue),
    completed: completed.nodes.map(toIssue),
    cut: projects.cut || started.cut || todo.cut || completed.cut,
  };
}
