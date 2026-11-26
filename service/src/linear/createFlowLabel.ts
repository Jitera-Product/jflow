import { gql } from './gql.js';

const MUTATION = `mutation CreateFlowLabel($name: String!, $parentId: String) {
  projectLabelCreate(input: { name: $name, parentId: $parentId }) { success projectLabel { id } }
}`;

export async function createFlowLabel(fetchFn: typeof fetch, apiKey: string, name: string, parentId: string | null): Promise<string> {
  const data = await gql<{ projectLabelCreate: { projectLabel: { id: string } } }>(fetchFn, apiKey, MUTATION, { name, parentId });
  return data.projectLabelCreate.projectLabel.id;
}
