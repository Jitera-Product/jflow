import { prRefOf } from './prRefOf.js';

// The PR cell is "#123", "123", "repo#123", a GitHub PR URL (also in <> or a markdown link), with notes after it
// like "#298 (draft)". The URL is known from a URL cell, or from an "org/repo" repo cell.
export function prLinkOf(cell: string, repoCell: string): { repo: string; pr: number | null; url: string | null } {
  const ref = prRefOf(/https:\/\/github\.com\/[^\s<>()]+?\/pull\/\d+/.exec(cell)?.[0] ?? '');
  if (ref) return { repo: ref.repo, pr: ref.number, url: `https://github.com/${ref.org}/${ref.repo}/pull/${ref.number}` };
  const short = /^(?:([\w.-]+\/)?([\w.-]+))?#\s*(\d+)\b|^(\d+)\b/.exec(cell);
  const full = /^([\w.-]+)\/([\w.-]+)$/.exec(repoCell);
  const org = short?.[1]?.slice(0, -1) ?? full?.[1];
  const repo = short?.[2] ?? (full ? full[2]! : repoCell);
  const n = short?.[3] ?? short?.[4];
  if (!n) return { repo, pr: null, url: null };
  return { repo, pr: Number(n), url: org ? `https://github.com/${org}/${repo}/pull/${n}` : null };
}
