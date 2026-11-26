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

export type FilterOptions = {
  teams: Array<{ id: string; name: string; key: string }>;
  statuses: Array<{ id: string; name: string; type: string }>;
};

export type FetchOptions = { apiKey: string; teams: string[]; statuses: string[]; window: string; paceDays: number };

export type Page<T> = { nodes: T[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } };

export type LinearUser = { id: string; name: string; displayName: string | null; email: string | null };
export type LinearProject = {
  id: string;
  name: string;
  url: string;
  status: { name: string; type: string } | null;
  lead: LinearUser | null;
  members: { nodes: LinearUser[] };
};
export type LinearIssue = {
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
