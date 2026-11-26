import { readFlowLabels } from './readFlowLabels.js';

export async function missingFlowLabels(fetchFn: typeof fetch, apiKey: string): Promise<string[]> {
  return (await readFlowLabels(fetchFn, apiKey)).missing;
}
