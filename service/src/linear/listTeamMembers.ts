import { gql } from './gql.js';

const QUERY = `query BoardTeamMembers($key: String!) {
  teams(filter: { key: { eq: $key } }) { nodes { members(first: 100) { nodes { id name email active } } } }
}`;

export async function listTeamMembers(fetchFn: typeof fetch, apiKey: string, teamKey: string): Promise<Array<{ id: string; name: string; email: string }>> {
  const data = await gql<{ teams: { nodes: Array<{ members: { nodes: Array<{ id: string; name: string; email: string; active: boolean }> } }> } }>(
    fetchFn, apiKey, QUERY, { key: teamKey });
  const members = data.teams.nodes[0]?.members.nodes ?? [];
  return members.filter((m) => m.active).map((m) => ({ id: m.id, name: m.name, email: m.email.toLowerCase() }));
}
