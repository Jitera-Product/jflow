import { describe, expect, it } from 'vitest';
import { readChecks } from '../src/qa/readChecks.js';
import { checksOf } from '../src/work/checksOf.js';
import { pilotOf } from '../src/work/pilotOf.js';
import { pilotOfLabels } from '../src/work/pilotOfLabels.js';
import { prLinkOf } from '../src/work/prLinkOf.js';
import { readBuildTable } from '../src/work/readBuildTable.js';
import { reviewOf } from '../src/work/reviewOf.js';
import { withGithub } from '../src/work/withGithub.js';
import type { BuildRow, GithubPr } from '../src/work/types.js';

describe('prLinkOf', () => {
  it('a URL cell gives repo, number and link', () => {
    expect(prLinkOf('https://github.com/acme/automation/pull/4812', 'automation'))
      .toEqual({ repo: 'automation', pr: 4812, url: 'https://github.com/acme/automation/pull/4812' });
    expect(prLinkOf('[#12](https://github.com/acme/x/pull/12/files)', '')).toEqual({ repo: 'x', pr: 12, url: 'https://github.com/acme/x/pull/12' });
  });
  it('#123 or 123 links only with an org/repo repo cell', () => {
    expect(prLinkOf('#123', 'acme/boost')).toEqual({ repo: 'boost', pr: 123, url: 'https://github.com/acme/boost/pull/123' });
    expect(prLinkOf('123', 'boost')).toEqual({ repo: 'boost', pr: 123, url: null });
    expect(prLinkOf('# 7', 'boost')).toEqual({ repo: 'boost', pr: 7, url: null });
  });
  it.each(['', '-', 'soon', 'https://gitlab.com/a/b/pull/1'])('no PR for %j', (cell) => {
    expect(prLinkOf(cell, 'boost')).toEqual({ repo: 'boost', pr: null, url: null });
  });
});

describe('readBuildTable', () => {
  const md = `# Status

| # | Stage | Status | File | Updated | By |
| --- | --- | --- | --- | --- | --- |
| 7 | Build | in progress | Linear issues | | |

## Build

|Issue|Repo|Branch|Base|PR|Status|
|---|---|---|---|---|---|
|  ENG-1  |  acme/automation | b1 | main |  #4812 |  In Review  |
| ENG-2 | boost | b2 | main | | waiting  for answer
| | | | | | |

## Gates

| Gate | From | To | Roles | Opened | Status | Approved by | Decided by | Sig |
| g1 | a | b | owner | x | open | | | s |
`;
  it('reads rows with extra spaces, a missing end pipe and mixed case, and stops at the next section', () => {
    expect(readBuildTable(md.split('\n'))).toEqual([
      { issue: 'ENG-1', repo: 'automation', pr: 4812, url: 'https://github.com/acme/automation/pull/4812', status: 'in review', github: null },
      { issue: 'ENG-2', repo: 'boost', pr: null, url: null, status: 'waiting for answer', github: null },
    ]);
  });
  it('is empty without the table', () => {
    expect(readBuildTable(['# Status', '## Gates'])).toEqual([]);
  });
});

describe('real 0-status.md files', () => {
  it('reads a Build table without a Branch column, with <url> PR cells and escaped repo names', () => {
    const md = `## Build

| Issue                 | Repo                        | Base                | PR                                                               | Status    |
| --------------------- | --------------------------- | ------------------- | ---------------------------------------------------------------- | --------- |
| CORE-3708 (CI-1)      | jitera\\_automation          | master              | <https://github.com/Jitera-Product/jitera_automation/pull/14308> | in review |
`;
    expect(readBuildTable(md.split('\n'))).toEqual([
      { issue: 'CORE-3708 (CI-1)', repo: 'jitera_automation', pr: 14308, url: 'https://github.com/Jitera-Product/jitera_automation/pull/14308', status: 'in review', github: null },
    ]);
  });
  it('reads backticked cells, notes after the PR and the status, repo#123 and None', () => {
    const md = `## Build

| Issue | Repo | Branch | Base | PR | Status |
| --- | --- | --- | --- | --- | --- |
| CORE-1 | \`jitera_automation\` | \`b\` | \`main\` | #298 (draft) | in review (do not merge until the release set is known) |
| CORE-2 | \`jitera-boost\` | b | main | jitera-boost#1134 | merged into #14229 |
| CORE-3 | jitera-boost | b | main | None | Implemented locally; commit af8054bd |
| CORE-4 | - | - | - | - | waiting (rollout, Omat) |
`;
    expect(readBuildTable(md.split('\n')).map(({ repo, pr, status }) => ({ repo, pr, status }))).toEqual([
      { repo: 'jitera_automation', pr: 298, status: 'in review' },
      { repo: 'jitera-boost', pr: 1134, status: 'merged' },
      { repo: 'jitera-boost', pr: null, status: 'implemented locally; commit af8054bd' },
      { repo: '-', pr: null, status: 'waiting' },
    ]);
  });
  it('org/repo#123 links without an org in the repo cell', () => {
    expect(prLinkOf('Jitera-Product/jitera-boost#1134', 'jitera-boost')).toEqual({ repo: 'jitera-boost', pr: 1134, url: 'https://github.com/Jitera-Product/jitera-boost/pull/1134' });
  });
});

describe('readChecks', () => {
  it('reads pass and fail in any case and spelling, and skips other results', () => {
    const md = `| Requirement | Check | Command or source | Result | Evidence |
| --- | --- | --- | --- | --- |
| R1 | Opens | e2e | Pass | https://ci/1 |
| R2 | Saves | e2e | **passed** | ok |
| R3 | Lists | grep | OK | |
| R4 | Empty text | look | FAIL | differs |
| R5 | Later | - | pending | |
| R6 | | e2e | failed | |`;
    expect(readChecks(md)).toEqual([
      { check: 'Opens', passed: true, evidence: 'https://ci/1' },
      { check: 'Saves', passed: true, evidence: 'ok' },
      { check: 'Lists', passed: true, evidence: '' },
      { check: 'Empty text', passed: false, evidence: 'differs' },
      { check: 'R6', passed: false, evidence: '' },
    ]);
    expect(readChecks('# Verification\n')).toEqual([]);
  });
});

describe('GitHub summaries', () => {
  it('review: the latest approve or request-changes per reviewer; dismissed drops it', () => {
    const r = (login: string, state: string) => ({ user: { login }, state });
    expect(reviewOf([])).toBeNull();
    expect(reviewOf([r('a', 'CHANGES_REQUESTED'), r('a', 'APPROVED')])).toBe('approved');
    expect(reviewOf([r('a', 'APPROVED'), r('b', 'CHANGES_REQUESTED'), r('b', 'COMMENTED')])).toBe('changes requested');
    expect(reviewOf([r('b', 'CHANGES_REQUESTED'), r('b', 'DISMISSED'), r('a', 'COMMENTED')])).toBeNull();
  });
  it('checks: failing beats running beats passing; none is null', () => {
    const run = (status: string, conclusion: string | null) => ({ status, conclusion });
    expect(checksOf([])).toBeNull();
    expect(checksOf([run('completed', 'success'), run('completed', 'skipped')])).toBe('passing');
    expect(checksOf([run('completed', 'success'), run('in_progress', null)])).toBe('running');
    expect(checksOf([run('in_progress', null), run('completed', 'timed_out')])).toBe('failing');
  });
  it('pilot label pilot-NN is PN without leading zeros', () => {
    expect(pilotOfLabels([{ name: 'bug' }, { name: 'pilot-05' }])).toBe('P5');
    expect(pilotOfLabels([{ name: 'Pilot-12' }])).toBe('P12');
    expect(pilotOfLabels([{ name: 'pilot' }, { name: 'pilot-x' }])).toBeNull();
  });
});

describe('pilotOf: one feature, one pilot', () => {
  const row = (state: GithubPr['state'] | null, pilot: string | null = null): BuildRow => ({
    issue: 'I', repo: 'r', pr: 1, url: 'u', status: 'in review',
    github: state ? { state, review: null, checks: null, pilot } : null,
  });
  it('all open PRs on the same pilot', () => {
    expect(pilotOf([row('open', 'P5'), row('draft', 'P5'), row('merged', 'P7')])).toEqual({ pilot: 'P5', mismatch: false });
  });
  it('no pilot on any open PR is nothing; PRs without GitHub data do not count', () => {
    expect(pilotOf([row('open'), row(null), row('closed', 'P3')])).toEqual({ pilot: null, mismatch: false });
    expect(pilotOf([])).toEqual({ pilot: null, mismatch: false });
  });
  it('different pilots, or one on a pilot and one on none, is a mismatch', () => {
    expect(pilotOf([row('open', 'P5'), row('open', 'P7')])).toEqual({ pilot: null, mismatch: true });
    expect(pilotOf([row('open', 'P5'), row('open')])).toEqual({ pilot: null, mismatch: true });
  });
});

describe('withGithub', () => {
  it('a PR GitHub says is merged or closed takes that status over the Build table', async () => {
    const pull = (n: string) => (n.endsWith('/1') ? { state: 'closed', merged: true } : { state: 'closed', merged: false });
    const f = (async (url: string) => new Response(JSON.stringify({ draft: false, labels: [], head: { sha: 's' }, ...pull(String(url)) }))) as typeof fetch;
    const row = (n: number): BuildRow => ({ issue: `I-${n}`, repo: 'r', pr: n, url: `https://github.com/o/r/pull/${n}`, status: 'in review', github: null });
    expect((await withGithub(f, 't', [row(1), row(2)])).map((r) => r.status)).toEqual(['merged', 'closed']);
  });
});
