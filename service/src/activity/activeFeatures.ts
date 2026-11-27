import type { Deps } from '../feature/types.js';

const WINDOW_MS = 10 * 60_000;

export async function activeFeatures(deps: Deps): Promise<Set<string>> {
  try {
    return new Set(await deps.activity.since(new Date(deps.now().getTime() - WINDOW_MS)));
  } catch (e) {
    console.warn(`jflow: feature activity: ${e instanceof Error ? e.message : String(e)}`);
    return new Set();
  }
}
