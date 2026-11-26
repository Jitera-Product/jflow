import { gql } from './gql.js';

const QUERY = `query FlowTeams { teams(first: 250) { nodes { key name } } }`;

export async function listTeams(fetchFn: typeof fetch, apiKey: string): Promise<Array<{ key: string; name: string }>> {
  const data = await gql<{ teams: { nodes: Array<{ key: string; name: string }> } }>(fetchFn, apiKey, QUERY, {});
  return data.teams.nodes.map((t) => ({ key: t.key, name: t.name }));
}
