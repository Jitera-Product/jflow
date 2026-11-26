import { gql } from './gql.js';
import { missingFlowLabels } from './missingFlowLabels.js';

const MUTATION = `mutation CreateFlowLabel($name: String!) { projectLabelCreate(input: { name: $name }) { success } }`;

export async function createFlowLabels(fetchFn: typeof fetch, apiKey: string): Promise<void> {
  for (const name of await missingFlowLabels(fetchFn, apiKey)) await gql(fetchFn, apiKey, MUTATION, { name });
}
