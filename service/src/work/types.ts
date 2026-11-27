export type GithubPr = {
  state: 'open' | 'draft' | 'merged' | 'closed';
  review: 'approved' | 'changes requested' | null;
  checks: 'passing' | 'failing' | 'running' | null;
  pilot: string | null; // P5 from a pilot-05 label
};
export type BuildRow = {
  issue: string; repo: string; pr: number | null; url: string | null; status: string;
  github: GithubPr | null;
};
