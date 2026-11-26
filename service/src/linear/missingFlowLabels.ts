import { flowLabels } from './flowLabels.js';
import { gql } from './gql.js';

const QUERY = `query FlowProjectLabels { projectLabels(first: 250) { nodes { name } } }`;

export async function missingFlowLabels(fetchFn: typeof fetch, apiKey: string): Promise<string[]> {
  const data = await gql<{ projectLabels: { nodes: Array<{ name: string }> } }>(fetchFn, apiKey, QUERY, {});
  const have = new Set(data.projectLabels.nodes.map((l) => l.name));
  return flowLabels().filter((l) => !have.has(l));
}
