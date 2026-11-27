import type { Deps } from '../feature/types.js';
import { listFlowProjects } from '../linear/listFlowProjects.js';
import { readChecks } from '../qa/readChecks.js';
import type { QaCheck } from '../qa/types.js';
import { withGithub } from '../work/withGithub.js';
import { folderIdOf } from './folderIdOf.js';
import { mapLimit } from './mapLimit.js';
import { readStatusFile } from './readStatusFile.js';
import { slugOfStatus } from './slugOfStatus.js';
import { stageOfLabel } from './stageOfLabel.js';
import type { BoardData, StatusFile } from './types.js';
import { WORK_STAGES } from './workStages.js';

// ponytail: reads every flow folder's 0-status.md, since only the file says which Linear project it is
export async function loadStageBoard(deps: Deps, fetchFn: typeof fetch, teams: string[]): Promise<BoardData> {
  const at = deps.now().toISOString();
  const flow = deps.config.flowFolder;
  const { linearApiKey, githubToken } = deps.settings.get();
  const [projects, entries] = await Promise.all([
    listFlowProjects(fetchFn, linearApiKey, teams),
    deps.docs.list(flow).catch(() => null),
  ]);
  const stageOf = new Map(projects.map((p) => [p.slugId, stageOfLabel(p.flowLabel)]));
  const folders = (entries ?? []).flatMap((entry) => {
    const id = folderIdOf(entry);
    return id ? [{ id, entry }] : [];
  });
  const read = await mapLimit(folders, 8, async ({ id, entry }) => {
    const md = await deps.docs.read(`${flow}/${entry}0-status.md`).catch(() => null);
    const slug = md === null ? null : slugOfStatus(md);
    const file = md === null ? null : readStatusFile(md);
    const stage = file?.stage ?? (slug ? stageOf.get(slug) : null);
    const verify = stage === 'Verify' ? await deps.docs.read(`${flow}/${entry}4-verification.md`).catch(() => null) : null;
    return { id, file, slug, stage, verify };
  });
  const files = new Map<string, StatusFile | null>();
  const ids = new Map<string, string>();
  const checks = new Map<string, QaCheck[]>();
  const github: Array<StatusFile> = [];
  for (const { id, file, slug, stage, verify } of read) {
    if (!slug || !file || ids.has(slug)) continue;
    ids.set(slug, id);
    files.set(slug, file);
    if (verify) checks.set(slug, readChecks(verify));
    if (stage && WORK_STAGES.includes(stage) && file.build.length) github.push(file);
  }
  await mapLimit(github, 4, async (file) => {
    file.build = await withGithub(fetchFn, githubToken, file.build);
  });
  return {
    projects: projects.map((p) => ({ ...p, identifier: ids.get(p.slugId) ?? null })),
    files, ids, checksBySlug: checks, filesFailed: entries === null, at,
  };
}
