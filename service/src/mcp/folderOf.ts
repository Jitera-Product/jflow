import { FeatureError } from '../feature/FeatureError.js';
import type { Feature } from '../feature/types.js';

export function folderOf(f: Feature): string {
  if (!f.folder) throw new FeatureError('no_folder', `Project ${f.identifier} has no flow folder yet. Start the feature first.`);
  return f.folder;
}
