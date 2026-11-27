import { prRefOf } from './prRefOf.js';

// The PR cell is "#123", "123" or a GitHub PR URL (also inside a markdown link).
// The URL is known from a URL cell, or from an "org/repo" repo cell.
export function prLinkOf(cell: string, repoCell: string): { repo: string; pr: number | null; url: string | null } {
  const ref = prRefOf(/https:\/\/github\.com\/\S+?\/pull\/\d+/.exec(cell)?.[0] ?? '');
  if (ref) return { repo: ref.repo, pr: ref.number, url: `https://github.com/${ref.org}/${ref.repo}/pull/${ref.number}` };
  const full = /^([\w.-]+)\/([\w.-]+)$/.exec(repoCell);
  const repo = full ? full[2]! : repoCell;
  const n = /^#?\s*(\d+)$/.exec(cell)?.[1];
  if (!n) return { repo, pr: null, url: null };
  return { repo, pr: Number(n), url: full ? `https://github.com/${full[1]}/${full[2]}/pull/${n}` : null };
}
