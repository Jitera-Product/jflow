export type Option = { id: string; name: string };
export type Options = { teams: Option[]; statuses: Option[] };
export type Filters = { window: string; teams: string[]; statuses: string[] };

type Person = { id: string; name: string };
type Issue = { id: string; title: string; url: string; status: string };

export type Forecast =
  | { kind: 'ok'; weeks: number; queue: number; perWeek: number }
  | { kind: 'few'; closures: number }
  | { kind: 'cut' };

export type PersonCard = {
  person: Person;
  ownProjects: Array<{ id: string; name: string; url: string; status: string; statusType: string; role: 'lead' | 'member'; count: number }>;
  otherProjects: Array<{ name: string; kind: 'off_board_project' | 'other_board_project'; count: number }>;
  noProject: Array<{ issue: Issue; stuck: boolean }>;
  agent: Array<{ issue: Issue; state: 'ready' | 'working' | 'review' | 'stuck' }>;
  bar: { own: number; outside: number; ready: number };
  outsideCount: number;
  forecast: Forecast;
};

export type BoardResponse = {
  summary: { people: number; active: number; offBoard: number; noProject: number; share: number; agentReady: number; agentReview: number };
  people: PersonCard[];
  notOnBoard: Array<{ person: Person; issues: number; noProject: number }>;
  settings: { paceDays: number; minClosures: number; stuckHours: number };
  window: string;
  updatedAt: string;
};
