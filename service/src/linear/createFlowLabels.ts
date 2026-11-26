import { createFlowLabel } from './createFlowLabel.js';
import { readFlowLabels } from './readFlowLabels.js';

export async function createFlowLabels(fetchFn: typeof fetch, apiKey: string): Promise<string[]> {
  const { missing, parentId } = await readFlowLabels(fetchFn, apiKey);
  for (const name of missing) await createFlowLabel(fetchFn, apiKey, name, parentId);
  return missing;
}
