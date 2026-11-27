import { expect, test } from 'vitest';
import type { BuildRow, GithubPr } from '@/api/types';
import { card, me } from '@/test/boardFixture';
import { cardChipsOf } from './cardChipsOf';
import { myActionOf } from './myActionOf';
import { pilotLineOf } from './pilotLineOf';
import { statusChipOf } from './statusChipOf';
import { waitingRowsOf } from './waitingRowsOf';
import { workChipOf } from './workChipOf';

const AT = '2026-11-26T10:00:00.000Z';
const row = (o: Partial<BuildRow> = {}): BuildRow => ({ issue: 'ENG-1', repo: 'automation', pr: 4812, url: null, status: 'in review', github: null, ...o });
const gh = (o: Partial<GithubPr> = {}): GithubPr => ({ state: 'open', review: null, checks: null, pilot: null, ...o });
const agent = [{ kind: 'agent' as const, names: ['the agent'] }];
const engineer = [{ kind: 'engineer' as const, names: ['an engineer'] }];
const owner = [{ kind: 'owner' as const, names: ['Mika Sato'] }];

test('card chips on Build: up to 3 PRs, then +N, and X of Y PRs with more than one issue', () => {
  const build = [row({ pr: 1 }), row({ pr: null }), row({ repo: 'frontend-core', pr: 2 }), row({ pr: 3 }), row({ repo: 'boost', pr: 4 })];
  expect(cardChipsOf(card({ stage: 'Build', build })).map((c) => c.text)).toEqual(['automation #1', 'frontend-core #2', 'automation #3', '+1', '4 of 5 PRs']);
  expect(cardChipsOf(card({ stage: 'Build', build: [row()] })).map((c) => c.text)).toEqual(['automation #4812']);
  expect(cardChipsOf(card({ stage: 'Spec', build }))).toEqual([]);
});

test('card chips: the pilot, a pilot mismatch in red, and N passed on Verify when every check passed', () => {
  expect(cardChipsOf(card({ stage: 'Verify', pilot: 'P5', qa: { passed: 3, failed: 0 } }))).toEqual([
    { text: 'Pilot P5', tone: 'quiet', mono: true }, { text: '3 passed', tone: 'pass' },
  ]);
  expect(cardChipsOf(card({ stage: 'Verify', qa: { passed: 2, failed: 1 } }))).toEqual([]);
  expect(cardChipsOf(card({ stage: 'Build', pilotMismatch: true }))).toEqual([{ text: 'Pilot mismatch', tone: 'fail' }]);
});

test('Build status chip: building is the agent at work, then a question, then reviews', () => {
  const build = (...statuses: string[]) => statuses.map((status) => row({ status }));
  expect(statusChipOf(card({ stage: 'Build', waitsFor: agent, build: build('in review', 'building', 'waiting for answer') }))).toEqual({ tone: 'working', text: 'Agent building' });
  expect(statusChipOf(card({ stage: 'Build', waitsFor: agent, build: build('in review', 'waiting for answer') }))).toEqual({ tone: 'person', text: 'Waits for an answer' });
  expect(statusChipOf(card({ stage: 'Build', waitsFor: engineer, build: build('in review', 'in review', 'merged') }))).toEqual({ tone: 'person', text: 'Review 2 PRs' });
  expect(statusChipOf(card({ stage: 'Build', waitsFor: engineer, waitingForMe: true, build: build('in review') }))).toEqual({ tone: 'you', text: 'You: review 1 PR' });
  expect(statusChipOf(card({ stage: 'Build', waitsFor: agent, build: build('merged', 'merged') }))).toEqual({ tone: 'agent', text: 'Agent' });
});

test('agent stages: a recent tool call is the agent working, else idle', () => {
  expect(statusChipOf(card({ stage: 'Spec', waitsFor: agent, agentActive: true }))).toEqual({ tone: 'working', text: 'Agent working' });
  expect(statusChipOf(card({ stage: 'Build', waitsFor: agent, agentActive: true }))).toEqual({ tone: 'working', text: 'Agent building' });
  expect(statusChipOf(card({ stage: 'Verify', waitsFor: agent, agentActive: true }))).toEqual({ tone: 'working', text: 'Agent checking' });
  expect(statusChipOf(card({ stage: 'Verify', waitsFor: agent }))).toEqual({ tone: 'agent', text: 'Agent' });
  expect(statusChipOf(card({ stage: 'Spec review', waitsFor: owner, agentActive: true }))).toEqual({ tone: 'person', text: 'Mika Sato' });
});

test('Verify with failed checks: the owner sees You, others the owner and the count; all passed is the usual owner chip', () => {
  const v = { stage: 'Verify', waitsFor: owner, owner: { name: 'Mika Sato', email: 'mika@example.com' } };
  expect(statusChipOf(card({ ...v, waitingForMe: true, qa: { passed: 2, failed: 1 } }))).toEqual({ tone: 'you', text: 'You: 1 QA check failed' });
  expect(myActionOf(card({ ...v, qa: { passed: 0, failed: 2 } }))).toBe('2 QA checks failed');
  expect(statusChipOf(card({ ...v, qa: { passed: 2, failed: 1 } }))).toEqual({ tone: 'person', text: 'Mika: 1 failed' });
  expect(statusChipOf(card({ ...v, waitingForMe: true, qa: { passed: 3, failed: 0 } }))).toEqual({ tone: 'you', text: 'You: verify the release' });
});

test('waiting: failed checks are a Decide row for the owner, linking to the panel', () => {
  const rows = waitingRowsOf([card({ key: 'P-ENG-12', stage: 'Verify', waitingForMe: true, qa: { passed: 2, failed: 1 }, days: 0 })], me(), AT);
  expect(rows.map((r) => [r.group, r.what, r.link?.href])).toEqual([['Decide', 'QA: 1 check failed. Fix it or accept it.', '/f/P-ENG-12']]);
  expect(waitingRowsOf([card({ stage: 'Verify', waitingForMe: true, qa: { passed: 0, failed: 3 } })], me(), AT)[0]!.what).toBe('QA: 3 checks failed. Fix it or accept it.');
});

test('work chip: GitHub says what happened to the PR, else the Build table status', () => {
  const text = (r: BuildRow) => workChipOf(r)?.text;
  expect(text(row({ github: gh({ state: 'merged' }) }))).toBe('Merged');
  expect(text(row({ github: gh({ state: 'draft', checks: 'failing' }) }))).toBe('Draft');
  expect(text(row({ github: gh({ checks: 'failing', review: 'approved' }) }))).toBe('Checks failing');
  expect(text(row({ github: gh({ review: 'changes requested' }) }))).toBe('Changes requested');
  expect(text(row({ github: gh({ review: 'approved', checks: 'passing' }) }))).toBe('Approved');
  expect(text(row({ github: gh() }))).toBe('In review');
  expect(workChipOf(row({ status: 'merged' }))).toEqual({ tone: 'pass', text: 'Merged' });
  expect(workChipOf(row({ status: 'building' }))).toEqual({ tone: 'working', text: 'Building' });
  expect(workChipOf(row({ status: 'waiting for answer' }))).toEqual({ tone: 'waits', text: 'Waits for answer' });
  expect(workChipOf(row({ status: 'waiting' }))).toEqual({ tone: 'quiet', text: 'Waiting' });
  expect(workChipOf(row({ status: 'in review' }))).toEqual({ tone: 'quiet', text: 'In review' });
  expect(workChipOf(row({ status: '' }))).toBeNull();
});

test('pilot line lists each repo with an open PR and its pilot', () => {
  expect(pilotLineOf([
    row({ repo: 'automation', github: gh({ pilot: 'P5' }) }),
    row({ repo: 'frontend-core', github: gh({ state: 'draft', pilot: 'P7' }) }),
    row({ repo: 'boost', github: gh() }),
    row({ repo: 'old', github: gh({ state: 'merged', pilot: 'P1' }) }),
    row({ repo: 'nogh' }),
  ])).toBe('automation P5, frontend-core P7, boost not on a pilot');
});
