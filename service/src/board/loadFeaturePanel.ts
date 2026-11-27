import { activeFeatures } from '../activity/activeFeatures.js';
import type { Deps } from '../feature/types.js';
import { chatUrlOf } from '../featureChats/chatUrlOf.js';
import { storedChat } from '../featureChats/storedChat.js';
import { listFlowProjects } from '../linear/listFlowProjects.js';
import { readChecks } from '../qa/readChecks.js';
import { lines } from '../status/lines.js';
import type { BuildRow } from '../work/types.js';
import { withGithub } from '../work/withGithub.js';
import { cardOf } from './cardOf.js';
import { type FeatureFolder, findFeatureFolder } from './findFeatureFolder.js';
import { readStageRows } from './readStageRows.js';
import { readStatusFile } from './readStatusFile.js';
import { stageOfLabel } from './stageOfLabel.js';
import type { FeaturePanel } from './types.js';
import { WORK_STAGES } from './workStages.js';

const NOTICE = 'jflow could not read the status file in Jitera.';
const VERIFICATION = '4-verification.md';

type Github = (id: string, rows: BuildRow[]) => Promise<BuildRow[]>;

// null when no flow project matches the key; github reads the PRs of the Build table, cached by the caller
export async function loadFeaturePanel(
  deps: Deps, fetchFn: typeof fetch, key: string, viewer: string,
  github: Github = (_id, rows) => withGithub(fetchFn, deps.settings.get().githubToken, rows),
): Promise<FeaturePanel | null> {
  const s = deps.settings.get();
  const listing = deps.docs.list(deps.config.flowFolder);
  listing.catch(() => {}); // handled below; this only keeps a Linear failure from leaving it unhandled
  const projects = await listFlowProjects(fetchFn, s.linearApiKey, s.teams);
  const bySlug = projects.find((p) => p.slugId === key);
  let found: FeatureFolder | null;
  let notice: string | null = null;
  try {
    found = await findFeatureFolder(deps, listing, projects, key, bySlug);
  } catch (e) {
    // without Jitera a project ID cannot be matched to a project; a slugId still has its Linear card
    if (!bySlug) throw e;
    found = null;
    notice = NOTICE;
  }
  const p = found?.p ?? bySlug;
  const stage = p && stageOfLabel(p.flowLabel);
  if (!p || !stage) return null;
  const file = found ? readStatusFile(found.md) : null;
  const id = found?.id ?? null;
  const [verify, active] = await Promise.all([
    found?.files.includes(VERIFICATION) ? deps.docs.read(`${found.folder}${VERIFICATION}`).catch(() => null) : null,
    activeFeatures(deps),
  ]);
  if (file && id && WORK_STAGES.includes(stage) && file.build.length) file.build = await github(id, file.build);
  const checks = verify ? readChecks(verify) : [];
  const card = cardOf({ ...p, identifier: id }, stage, file, id, s.engineers, viewer, deps.now(), {
    checks: stage === 'Verify' ? checks : [], active: !!id && active.has(id.toUpperCase()),
  });
  const folder = found?.folder ?? null;
  const chatUrl = chatUrlOf(s.flowAgentUrl, folder, found ? await storedChat(deps, found.id) : null);
  const row = card.openGate && file!.gates.find((g) => g.id === card.openGate!.id);
  return {
    card,
    stages: found ? readStageRows(lines(found.md)) : [],
    log: file?.log ?? [],
    gate: card.openGate && row ? {
      url: `/gate/${id}/${card.openGate.id}`,
      from: stageOfLabel(row.from) ?? row.from, to: stageOfLabel(row.to) ?? row.to, missing: card.openGate.missing,
    } : null,
    files: found?.files ?? [],
    linearUrl: p.url,
    behind: card.behind,
    folder,
    chatUrl,
    notice,
    checks,
  };
}
