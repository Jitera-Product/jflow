import { gql } from './gql.js';

export async function checkLinear(fetchFn: typeof fetch, apiKey: string): Promise<void> {
  await gql(fetchFn, apiKey, `query FlowViewer { viewer { id } }`, {});
}
