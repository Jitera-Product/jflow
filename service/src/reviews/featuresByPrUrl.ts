import type { BoardData } from '../board/types.js';

export function featuresByPrUrl(data: BoardData): Map<string, { key: string; name: string }> {
  const byUrl = new Map<string, { key: string; name: string }>();
  for (const p of data.projects) {
    for (const row of data.files.get(p.slugId)?.build ?? []) {
      if (row.url) byUrl.set(row.url.toLowerCase(), { key: p.identifier ?? p.slugId, name: p.name });
    }
  }
  return byUrl;
}
