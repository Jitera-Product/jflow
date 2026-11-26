import type { Deps } from '../feature/types.js';
import { listFlowProjects } from '../linear/listFlowProjects.js';
import { folderIdOf } from './folderIdOf.js';
import { mapLimit } from './mapLimit.js';
import { readStatusFile } from './readStatusFile.js';
import { slugOfStatus } from './slugOfStatus.js';
import type { BoardData, StatusFile } from './types.js';

// ponytail: reads every flow folder's 0-status.md, since only the file says which Linear project it is
export async function loadStageBoard(deps: Deps, fetchFn: typeof fetch, teams: string[]): Promise<BoardData> {
  const at = deps.now().toISOString();
  const flow = deps.config.flowFolder;
  const [projects, entries] = await Promise.all([
    listFlowProjects(fetchFn, deps.settings.get().linearApiKey, teams),
    deps.docs.list(flow).catch(() => null),
  ]);
  const folders = (entries ?? []).flatMap((entry) => {
    const id = folderIdOf(entry);
    return id ? [{ id, entry }] : [];
  });
  const read = await mapLimit(folders, 8, async ({ id, entry }) => {
    const md = await deps.docs.read(`${flow}/${entry}0-status.md`).catch(() => null);
    return { id, md, slug: md === null ? null : slugOfStatus(md) };
  });
  const files = new Map<string, StatusFile | null>();
  const ids = new Map<string, string>();
  for (const { id, md, slug } of read) {
    if (!slug || md === null || ids.has(slug)) continue;
    ids.set(slug, id);
    files.set(slug, readStatusFile(md));
  }
  return {
    projects: projects.map((p) => ({ ...p, identifier: ids.get(p.slugId) ?? null })),
    files, ids, filesFailed: entries === null, at,
  };
}
