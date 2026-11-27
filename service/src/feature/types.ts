import type { FeatureActivityStore } from '../activity/types.js';
import type { LiveChatTokens } from '../chats/types.js';
import type { Config } from '../config/types.js';
import type { FeatureChatStore } from '../featureChats/types.js';
import type { Documents } from '../documents/types.js';
import type { Tracker, TrackerProject } from '../linear/types.js';
import type { LiveSettings } from '../settings/types.js';

export type Deps = { config: Config; settings: LiveSettings; chats: LiveChatTokens; featureChats: FeatureChatStore; activity: FeatureActivityStore; docs: Documents; tracker: Tracker; now: () => Date };
export type Feature = TrackerProject & { folder: string | null; files: string[]; status: string | null };
