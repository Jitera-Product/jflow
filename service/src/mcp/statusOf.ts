import { FeatureError } from '../feature/FeatureError.js';
import type { Feature } from '../feature/types.js';
import { folderOf } from './folderOf.js';

export function statusOf(f: Feature): { path: string; md: string } {
  const folder = folderOf(f);
  if (f.status === null) throw new FeatureError('no_folder', `Project ${f.identifier} has no 0-status.md yet. Start the feature first.`);
  return { path: `${folder}/0-status.md`, md: f.status };
}
