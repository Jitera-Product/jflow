import { FeatureError } from './FeatureError.js';
import type { Deps, Feature } from './types.js';

export async function loadFeature(deps: Deps, ref: string): Promise<Feature> {
  const p = await deps.tracker.getProject(ref);
  if (!p) throw new FeatureError('not_found', `No Linear project "${ref}". Give the project ID, like P-CORE-396.`);
  if (!p.teams.some((t) => deps.config.teams.includes(t))) {
    throw new FeatureError('team_not_enabled', `Project ${p.identifier} is in no team that uses jflow.`);
  }
  const found = (await deps.docs.list(deps.config.flowFolder)).filter((e) => e.startsWith(`${p.identifier} `) && e.endsWith('/'));
  if (found.length > 1) {
    throw new FeatureError('no_folder', `Project ${p.identifier} has more than one folder: ${found.join(', ')}. Ask a person to remove one.`);
  }
  const entry = found[0];
  if (!entry) return { ...p, folder: null, files: [], status: null };
  const folder = `${deps.config.flowFolder}/${entry.slice(0, -1)}`;
  return { ...p, folder, files: await deps.docs.list(folder), status: await deps.docs.read(`${folder}/0-status.md`) };
}
