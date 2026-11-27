import type { Deps } from '../feature/types.js';

const WINDOW_MS = 10 * 60_000;

// Features the agent called a jflow tool for in the last 10 minutes. Empty, with a warning, when the store fails.
export async function activeFeatures(deps: Deps): Promise<Set<string>> {
  try {
    return new Set(await deps.activity.since(new Date(deps.now().getTime() - WINDOW_MS)));
  } catch (e) {
    console.warn(`jflow: feature activity: ${e instanceof Error ? e.message : String(e)}`);
    return new Set();
  }
}
