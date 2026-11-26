import type { Config } from '../config/types.js';
import type { LiveSettings } from '../settings/types.js';
import { importLegacyTokens } from './importLegacyTokens.js';
import { openChatTokens } from './openChatTokens.js';
import type { ChatTokenStore, LiveChatTokens } from './types.js';

export async function startChatTokens(
  store: ChatTokenStore,
  settings: LiveSettings,
  config: Config,
  env: Record<string, string | undefined>,
  now: () => Date,
): Promise<LiveChatTokens> {
  const pending = !settings.get().legacyChatsImported;
  const chats = await openChatTokens(store, config.settingsKey, pending ? importLegacyTokens(config, env) : [], now);
  if (pending) await settings.markLegacyChatsImported();
  return chats;
}
