import { gql } from './gql.js';
import type { FlowProject } from './types.js';

const QUERY = `query BoardProjects($teams: [String!], $after: String) {
  projects(first: 100, after: $after, filter: { accessibleTeams: { some: { key: { in: $teams } } } }) {
    pageInfo { hasNextPage endCursor }
    nodes {
      id slugId name url updatedAt
      status { type }
      lead { name email }
      teams { nodes { key } }
      labels { nodes { name } }
    }
  }
}`;

type Node = {
  id: string; slugId: string; name: string; url: string; updatedAt: string;
  status: { type: string };
  lead: { name: string; email: string } | null;
  teams: { nodes: Array<{ key: string }> };
  labels: { nodes: Array<{ name: string }> };
};
type Page = { projects: { pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: Node[] } };

export async function listFlowProjects(fetchFn: typeof fetch, apiKey: string, teamKeys: string[]): Promise<FlowProject[]> {
  const out: FlowProject[] = [];
  let after: string | null = null;
  do {
    const page: Page = await gql<Page>(fetchFn, apiKey, QUERY, { teams: teamKeys, after });
    const { projects } = page;
    for (const n of projects.nodes) {
      const flow = n.labels.nodes.filter((l) => l.name.startsWith('flow:'));
      if (flow.length !== 1 || n.status.type === 'canceled') continue;
      out.push({
        uuid: n.id, slugId: n.slugId, identifier: null, name: n.name, url: n.url,
        team: n.teams.nodes.find((t) => teamKeys.includes(t.key))?.key ?? n.teams.nodes[0]?.key ?? '',
        lead: n.lead ? { name: n.lead.name, email: n.lead.email.toLowerCase() } : null,
        flowLabel: flow[0]!.name, state: n.status.type, updatedAt: n.updatedAt,
      });
    }
    after = projects.pageInfo.hasNextPage ? projects.pageInfo.endCursor : null;
  } while (after);
  return out;
}
