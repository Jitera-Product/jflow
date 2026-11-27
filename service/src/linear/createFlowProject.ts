import { createFlowLabel } from './createFlowLabel.js';
import { gql } from './gql.js';
import { readFlowLabels } from './readFlowLabels.js';

const INTENT = 'flow:intent';
const LOOKUP = `query BoardCreateLookup($key: String!, $label: String!) {
  teams(filter: { key: { eq: $key } }) { nodes { id } }
  projectLabels(first: 5, filter: { name: { eq: $label } }) { nodes { id name } }
}`;
const CREATE = `mutation BoardProjectCreate($input: ProjectCreateInput!) {
  projectCreate(input: $input) { success project { id slugId url } }
}`;

export async function createFlowProject(
  fetchFn: typeof fetch, apiKey: string,
  input: { teamKey: string; name: string; summary: string; content: string; leadId?: string },
): Promise<{ uuid: string; slugId: string; url: string }> {
  const found = await gql<{ teams: { nodes: Array<{ id: string }> }; projectLabels: { nodes: Array<{ id: string; name: string }> } }>(
    fetchFn, apiKey, LOOKUP, { key: input.teamKey, label: INTENT });
  const teamId = found.teams.nodes[0]?.id;
  if (!teamId) throw new Error(`Linear: team ${input.teamKey} not found`);
  let labelId = found.projectLabels.nodes.find((l) => l.name === INTENT)?.id;
  if (!labelId) {
    const { parentId } = await readFlowLabels(fetchFn, apiKey);
    labelId = await createFlowLabel(fetchFn, apiKey, INTENT, parentId);
  }
  const data = await gql<{ projectCreate: { success: boolean; project: { id: string; slugId: string; url: string } | null } }>(fetchFn, apiKey, CREATE, {
    input: { name: input.name, description: input.summary.replace(/\s+/g, ' ').trim().slice(0, 255), content: input.content, teamIds: [teamId], ...(input.leadId ? { leadId: input.leadId } : {}), labelIds: [labelId] },
  });
  const p = data.projectCreate.project;
  if (!data.projectCreate.success || !p) throw new Error('Linear: could not create the project');
  return { uuid: p.id, slugId: p.slugId, url: p.url };
}
