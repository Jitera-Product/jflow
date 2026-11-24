import type { Config } from '../config/types.js';
import type { Documents } from '../documents/types.js';
import type { Tracker, TrackerProject } from '../linear/types.js';

export type Deps = { config: Config; docs: Documents; tracker: Tracker; now: () => Date };
export type Feature = TrackerProject & { folder: string | null; files: string[]; status: string | null };
