import type { Deps } from '../feature/types.js';
import { storedChat } from '../featureChats/storedChat.js';
import { chatIdOf } from './chatIdOf.js';
import { chatPointer } from './chatPointer.js';

type Result = { isError?: boolean; content: Array<{ type: 'text'; text: string }> };

// A feature belongs to the first chat the agent worked on it in. Another chat gets only a pointer to it,
// never the feature's data. A failing store never fails the tool.
export async function inFeatureChat<R extends Result>(
  deps: Deps, project: string, meta: Record<string, unknown> | undefined, body: () => Promise<R>,
): Promise<R | Result> {
  const chat = chatIdOf(meta);
  if (!chat) return body();
  const feature = project.trim().toUpperCase();
  const stored = await storedChat(deps, feature);
  if (stored && stored !== chat) return { isError: true, content: [{ type: 'text', text: await chatPointer(deps, feature, stored) }] };
  const result = await body();
  if (!stored && !result.isError) {
    await deps.featureChats.remember(feature, chat, deps.now()).catch((e: unknown) => {
      console.warn(`jflow: feature chats: ${feature}: ${e instanceof Error ? e.message : String(e)}`);
    });
  }
  return result;
}
