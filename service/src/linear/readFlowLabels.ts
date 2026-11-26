import { flowLabels } from './flowLabels.js';
import { gql } from './gql.js';

const QUERY = `query FlowProjectLabels { projectLabels(first: 250) { nodes { name parent { id } } } }`;

type Node = { name: string; parent?: { id: string } | null };

// parentId: the group the existing flow:* labels sit in, so new ones join it (Linear keeps one label per group).
export async function readFlowLabels(fetchFn: typeof fetch, apiKey: string): Promise<{ missing: string[]; parentId: string | null }> {
  const data = await gql<{ projectLabels: { nodes: Node[] } }>(fetchFn, apiKey, QUERY, {});
  const have = new Set(data.projectLabels.nodes.map((l) => l.name));
  const parentId = data.projectLabels.nodes.find((l) => l.name.startsWith('flow:') && l.parent)?.parent?.id ?? null;
  return { missing: flowLabels().filter((l) => !have.has(l)), parentId };
}
