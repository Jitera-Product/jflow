import type { Deps } from '../feature/types.js';
import { listFlowProjects } from '../linear/listFlowProjects.js';
import type { FlowProject } from '../linear/types.js';
import { lines } from '../status/lines.js';
import { cardOf } from './cardOf.js';
import { folderIdOf } from './folderIdOf.js';
import { readStageRows } from './readStageRows.js';
import { readStatusFile } from './readStatusFile.js';
import { slugOfStatus } from './slugOfStatus.js';
import { stageOfLabel } from './stageOfLabel.js';
import type { FeaturePanel } from './types.js';

// key is a project ID (the folder "<ID> <name>/") or a Linear slugId; null when no flow project matches
export async function loadFeaturePanel(deps: Deps, fetchFn: typeof fetch, key: string, viewer: string): Promise<FeaturePanel | null> {
  const s = deps.settings.get();
  const flow = deps.config.flowFolder;
  const [projects, entries] = await Promise.all([listFlowProjects(fetchFn, s.linearApiKey, s.teams), deps.docs.list(flow)]);
  const bySlug = projects.find((p) => p.slugId === key);
  // a slugId card has no folder on the board; a folder made since is found by the name startFeature gives it
  const candidates = entries.filter((e) => bySlug ? e.endsWith(` ${bySlug.name.replaceAll('/', '-')}/`) && folderIdOf(e) : folderIdOf(e) === key);
  let found: { p: FlowProject; id: string; entry: string; md: string } | null = null;
  for (const entry of candidates) {
    const md = await deps.docs.read(`${flow}/${entry}0-status.md`);
    const p = md === null ? undefined : projects.find((x) => x.slugId === slugOfStatus(md) && (!bySlug || x === bySlug));
    if (p) {
      found = { p, id: folderIdOf(entry)!, entry, md: md! };
      break;
    }
  }
  const p = found?.p ?? bySlug;
  const stage = p && stageOfLabel(p.flowLabel);
  if (!p || !stage) return null;
  const file = found ? readStatusFile(found.md) : null;
  const id = found?.id ?? null;
  const card = cardOf({ ...p, identifier: id }, stage, file, id, s.engineers, viewer, deps.now());
  const row = card.openGate && file!.gates.find((g) => g.id === card.openGate!.id);
  return {
    card,
    stages: found ? readStageRows(lines(found.md)) : [],
    log: file?.log ?? [],
    gate: card.openGate && row ? {
      url: `${s.publicUrl}/gate/${id}/${card.openGate.id}`,
      from: stageOfLabel(row.from) ?? row.from, to: stageOfLabel(row.to) ?? row.to, missing: card.openGate.missing,
    } : null,
    files: found ? await deps.docs.list(`${flow}/${found.entry.slice(0, -1)}`) : [],
    linearUrl: p.url,
    behind: card.behind,
  };
}
