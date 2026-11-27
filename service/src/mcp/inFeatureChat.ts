import type { Deps } from '../feature/types.js';
import { storedChat } from '../featureChats/storedChat.js';
import { chatIdOf } from './chatIdOf.js';
import { chatPointer } from './chatPointer.js';

type Result = { isError?: boolean; content: Array<{ type: 'text'; text: string }> };

const warn = (what: string, feature: string, e: unknown) =>
  console.warn(`jflow: ${what}: ${feature}: ${e instanceof Error ? e.message : String(e)}`);

// A feature belongs to the first chat the agent worked on it in. Another chat gets only a pointer to it,
// never the feature's data. Each call in the feature's chat marks the agent active on it.
// A failing store never fails the tool.
export async function inFeatureChat<R extends Result>(
  deps: Deps, project: string, meta: Record<string, unknown> | undefined, body: () => Promise<R>,
): Promise<R | Result> {
  const feature = project.trim().toUpperCase();
  const chat = chatIdOf(meta);
  const stored = chat ? await storedChat(deps, feature) : null;
  if (stored && stored !== chat) return { isError: true, content: [{ type: 'text', text: await chatPointer(deps, feature, stored) }] };
  await deps.activity.touch(feature, deps.now()).catch((e: unknown) => warn('feature activity', feature, e));
  const result = await body();
  if (chat && !stored && !result.isError) {
    await deps.featureChats.remember(feature, chat, deps.now()).catch((e: unknown) => warn('feature chats', feature, e));
  }
  return result;
}
