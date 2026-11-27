import { mapLimit } from '../board/mapLimit.js';
import { readGithubPr } from './readGithubPr.js';
import type { BuildRow } from './types.js';

// What happened to each PR, from GitHub. A row whose read fails keeps no GitHub data.
export async function withGithub(fetchFn: typeof fetch, token: string, rows: BuildRow[]): Promise<BuildRow[]> {
  if (!token) return rows;
  return mapLimit(rows, 4, async (row) => {
    if (!row.url) return row;
    try {
      return { ...row, github: await readGithubPr(fetchFn, token, row.url) };
    } catch (e) {
      console.warn(`jflow: github: ${row.url}: ${e instanceof Error ? e.message : String(e)}`);
      return row;
    }
  });
}
