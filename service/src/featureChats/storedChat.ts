import type { Deps } from '../feature/types.js';

// null, with a warning, when the store fails: the panel still links the folder
export async function storedChat(deps: Deps, feature: string): Promise<string | null> {
  try {
    return await deps.featureChats.get(feature);
  } catch (e) {
    console.warn(`jflow: feature chats: ${feature}: ${e instanceof Error ? e.message : String(e)}`);
    return null;
  }
}
