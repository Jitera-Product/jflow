import { gql } from './gql.js';
import { missingFlowLabels } from './missingFlowLabels.js';

const MUTATION = `mutation CreateFlowLabel($name: String!) { projectLabelCreate(input: { name: $name }) { success } }`;

export async function createFlowLabels(fetchFn: typeof fetch, apiKey: string): Promise<string[]> {
  const missing = await missingFlowLabels(fetchFn, apiKey);
  for (const name of missing) await gql(fetchFn, apiKey, MUTATION, { name });
  return missing;
}
