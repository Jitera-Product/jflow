import { MAX_PAGES } from './queries.js';
import type { Page } from './types.js';

export async function allPages<T>(fetchPage: (after: string | null) => Promise<Page<T>>): Promise<{ nodes: T[]; cut: boolean }> {
  const nodes: T[] = [];
  let after: string | null = null;
  for (let n = 0; n < MAX_PAGES; n++) {
    const page: Page<T> = await fetchPage(after);
    nodes.push(...page.nodes);
    if (!page.pageInfo.hasNextPage) return { nodes, cut: false };
    after = page.pageInfo.endCursor;
  }
  return { nodes, cut: true };
}
