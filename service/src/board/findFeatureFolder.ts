import type { Deps } from '../feature/types.js';
import type { FlowProject } from '../linear/types.js';
import { folderIdOf } from './folderIdOf.js';
import { slugOfStatus } from './slugOfStatus.js';

export type FeatureFolder = { p: FlowProject; id: string; folder: string; md: string; files: string[] };

// key is a project ID (the folder "<ID> <name>/") or a Linear slugId
export async function findFeatureFolder(
  deps: Deps, listing: Promise<string[]>, projects: FlowProject[], key: string, bySlug: FlowProject | undefined,
): Promise<FeatureFolder | null> {
  const flow = deps.config.flowFolder;
  const entries = await listing;
  // a slugId card has no folder on the board; a folder made since is found by the name startFeature gives it
  const candidates = entries.filter((e) => bySlug ? e.endsWith(` ${bySlug.name.replaceAll('/', '-')}/`) && folderIdOf(e) : folderIdOf(e) === key);
  for (const entry of candidates) {
    const md = await deps.docs.read(`${flow}/${entry}0-status.md`);
    const p = md === null ? undefined : projects.find((x) => x.slugId === slugOfStatus(md) && (!bySlug || x === bySlug));
    if (p) {
      const folder = `${flow}/${entry}`;
      return { p, id: folderIdOf(entry)!, folder, md: md!, files: await deps.docs.list(folder.slice(0, -1)) };
    }
  }
  return null;
}
