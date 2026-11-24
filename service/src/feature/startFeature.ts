import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { appendLog } from '../status/appendLog.js';
import { day } from './day.js';
import { loadFeature } from './loadFeature.js';
import type { Deps, Feature } from './types.js';

export async function startFeature(deps: Deps, ref: string, by: string): Promise<Feature> {
  const f = await loadFeature(deps, ref);
  if (f.folder && f.status !== null) return f;
  const folder = f.folder ?? `${deps.config.flowFolder}/${f.identifier} ${f.name.replaceAll('/', '-')}`;
  const fill = (file: string) => readFileSync(join(deps.config.templatesDir, file), 'utf8')
    .replaceAll('<PROJECT-ID>', f.identifier).replaceAll('<Project name>', f.name).replaceAll('<project URL>', f.url);
  const status = appendLog(fill('0-status.md'), `${day(deps)} - Intent - ${by} - folder created`);
  await deps.docs.create(`${folder}/0-status.md`, status);
  if (!f.files.includes('1-intent.md')) await deps.docs.create(`${folder}/1-intent.md`, fill('1-intent.md'));
  let flowLabel = f.flowLabel;
  if (!flowLabel) {
    flowLabel = 'flow:intent';
    await deps.tracker.setFlowLabel(f.id, flowLabel);
  }
  return { ...f, flowLabel, folder, files: [...new Set([...f.files, '0-status.md', '1-intent.md'])].sort(), status };
}
