import { mapLimit } from '../board/mapLimit.js';
import { readGithubPr } from './readGithubPr.js';
import type { BuildRow } from './types.js';

export async function withGithub(fetchFn: typeof fetch, token: string, rows: BuildRow[]): Promise<BuildRow[]> {
  if (!token) return rows;
  return mapLimit(rows, 4, async (row) => {
    if (!row.url) return row;
    try {
      const github = await readGithubPr(fetchFn, token, row.url);
      const done = github?.state === 'merged' || github?.state === 'closed';
      return { ...row, github, status: done ? github!.state : row.status };
    } catch (e) {
      console.warn(`jflow: github: ${row.url}: ${e instanceof Error ? e.message : String(e)}`);
      return row;
    }
  });
}
