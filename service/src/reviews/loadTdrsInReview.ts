import { mapLimit } from '../board/mapLimit.js';
import type { Deps } from '../feature/types.js';
import { docsUrlOf } from './docsUrlOf.js';
import { pendingReviewersOf } from './pendingReviewersOf.js';
import { tdrTitleOf } from './tdrTitleOf.js';
import type { TdrInReview } from './types.js';

const DEFAULT_FOLDER = 'Technical Design Record (TDR)';

export async function loadTdrsInReview(deps: Deps): Promise<TdrInReview[]> {
  const { tdrFolder, flowAgentUrl } = deps.settings.get();
  const folder = `documents/${(tdrFolder || DEFAULT_FOLDER).replace(/^documents\//, '').replace(/\/+$/, '')}`;
  const files = (await deps.docs.list(folder)).filter((f) => f.toLowerCase().endsWith('.md'));
  const read = await mapLimit(files, 8, async (file) => {
    const path = `${folder}/${file}`;
    const md = await deps.docs.read(path).catch(() => null);
    return { title: tdrTitleOf(file), path, url: docsUrlOf(flowAgentUrl, path), reviewers: md ? pendingReviewersOf(md) : [] };
  });
  return read.filter((t) => t.reviewers.length > 0);
}
