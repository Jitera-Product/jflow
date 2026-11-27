import { githubGet } from '../work/githubGet.js';
import type { ReviewPr } from './types.js';

type Item = { number: number; title: string; html_url: string; repository_url: string; updated_at: string; user: { login: string } | null };

const SEARCH = '/search/issues?q=is:pr+is:open+archived:false+review-requested:@me&sort=updated&per_page=50';

export async function searchReviewPrs(fetchFn: typeof fetch, token: string): Promise<ReviewPr[]> {
  const { items } = await githubGet<{ items: Item[] }>(fetchFn, token, SEARCH);
  return items.map((i) => ({
    repo: i.repository_url.split('/').slice(-2).join('/'),
    number: i.number, title: i.title, url: i.html_url, author: i.user?.login ?? '', updatedAt: i.updated_at,
    feature: null,
  }));
}
