import { FeatureError } from '../feature/FeatureError.js';
import type { Feature } from '../feature/types.js';

export const statusPath = (f: Feature) => {
  if (!f.folder || f.status === null) throw new FeatureError('no_folder', `Project ${f.identifier} has no flow folder yet. Start the feature first.`);
  return `${f.folder}/0-status.md`;
};
