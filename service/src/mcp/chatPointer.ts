import { chatUrlOf } from '../featureChats/chatUrlOf.js';
import type { Deps } from '../feature/types.js';

export async function chatPointer(deps: Deps, feature: string, chat: string): Promise<string> {
  const flow = deps.config.flowFolder;
  const entries = await deps.docs.list(flow).catch(() => [] as string[]); // without the folder the link still opens the chat
  const entry = entries.find((e) => e.startsWith(`${feature} `) && e.endsWith('/'));
  const url = chatUrlOf(deps.settings.get().flowAgentUrl, entry ? `${flow}/${entry}` : null, chat);
  return url ? `This feature already has a chat: ${url}. Continue there.` : 'This feature already has a chat in Jitera. Ask its owner for access.';
}
