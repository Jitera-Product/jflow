import type { Deps } from '../feature/types.js';
import { chatUrlOf } from '../featureChats/chatUrlOf.js';
import { storedChat } from '../featureChats/storedChat.js';
import { listFlowProjects } from '../linear/listFlowProjects.js';
import { lines } from '../status/lines.js';
import { cardOf } from './cardOf.js';
import { type FeatureFolder, findFeatureFolder } from './findFeatureFolder.js';
import { readStageRows } from './readStageRows.js';
import { readStatusFile } from './readStatusFile.js';
import { stageOfLabel } from './stageOfLabel.js';
import type { FeaturePanel } from './types.js';

const NOTICE = 'jflow could not read the status file in Jitera.';

// null when no flow project matches the key
export async function loadFeaturePanel(deps: Deps, fetchFn: typeof fetch, key: string, viewer: string): Promise<FeaturePanel | null> {
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
  const card = cardOf({ ...p, identifier: id }, stage, file, id, s.engineers, viewer, deps.now());
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
  };
}
