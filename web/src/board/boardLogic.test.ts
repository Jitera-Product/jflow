import { expect, test } from 'vitest';
import { board, card, me } from '@/test/boardFixture';
import { daysText } from '@/lib/daysText';
import { firstNameOf } from '@/lib/firstNameOf';
import { initialsOf } from '@/lib/initialsOf';
import { shortDate } from '@/lib/shortDate';
import { boardSummary } from './boardSummary';
import { filterCards } from './filterCards';
import { myActionOf } from './myActionOf';
import { ownersOf } from './ownersOf';
import { phaseColumnsOf } from './phaseColumnsOf';
import { progressOf } from './progressOf';
import { statusChipOf } from './statusChipOf';
import { waitingRowsOf } from './waitingRowsOf';

const AT = '2026-11-26T10:00:00.000Z';
const gate = (o = {}) => ({ id: 'g1', from: 'flow:spec-review', to: 'flow:tdr', opened: '2026-11-22T10:00:00.000Z', missing: ['owner' as const], ...o });

test('phases group the stages in order: Idea, Shape, Build, Ship', () => {
  const cards = [card({ key: 'a', stage: 'Done' }), card({ key: 'b', stage: 'Intent' }), card({ key: 'c', stage: 'Plan' }), card({ key: 'd', stage: 'Spec' })];
  const phases = phaseColumnsOf(board(cards).columns);
  expect(phases.map((p) => [p.name, p.hint, p.cards.map((c) => c.key)])).toEqual([
    ['Idea', 'Intent', ['b']],
    ['Shape', 'Spec, TDR, UI, Plan', ['d', 'c']],
    ['Build', 'Build', []],
    ['Ship', 'Verify, Done', ['a']],
  ]);
});

test('progress runs from a sliver at Intent to full at Done', () => {
  expect(progressOf('Intent')).toBeCloseTo(1 / 9);
  expect(progressOf('UI')).toBeCloseTo(5 / 9);
  expect(progressOf('Done')).toBe(1);
  expect(progressOf('Nope')).toBe(0);
});

test('my action: the gate to approve, else the work of the stage', () => {
  expect(myActionOf(card({ openGate: gate() }))).toBe('approve the spec');
  expect(myActionOf(card({ openGate: gate({ from: 'flow:intent', to: 'flow:spec' }) }))).toBe('approve the intent');
  expect(myActionOf(card({ stage: 'UI' }))).toBe('draw and approve UI');
  expect(myActionOf(card({ stage: 'Intent' }))).toBe('write the intent');
  expect(myActionOf(card({ stage: 'TDR' }))).toBe('write the TDR');
});

test('status chip: you, a person, needs an owner, the agent, done', () => {
  expect(statusChipOf(card({ waitingForMe: true, stage: 'UI' }))).toEqual({ tone: 'you', text: 'You: draw and approve UI' });
  expect(statusChipOf(card({ waitsFor: [{ kind: 'owner', names: ['Dana Lee'] }] }))).toEqual({ tone: 'person', text: 'Dana Lee' });
  expect(statusChipOf(card({ waitsFor: [{ kind: 'owner', names: ['an owner'] }] }))).toEqual({ tone: 'person', text: 'Needs an owner' });
  expect(statusChipOf(card({ waitsFor: [{ kind: 'owner', names: ['Mika'] }, { kind: 'engineer', names: ['an engineer'] }] }))).toEqual({ tone: 'person', text: 'Mika, an engineer' });
  expect(statusChipOf(card({ stage: 'Spec', waitsFor: [{ kind: 'agent', names: ['the agent'] }] }))).toEqual({ tone: 'agent', text: 'Agent' });
  expect(statusChipOf(card({ stage: 'Done', since: '2026-11-18', waitsFor: [] }))).toEqual({ tone: 'done', text: 'Done Nov 18' });
  expect(statusChipOf(card({ waitsFor: [] }))).toBeNull();
});

test('waiting rows: open gates to approve with the confirm link, other owner work to decide in the panel, oldest first', () => {
  const cards = [
    card({ key: 'P-ENG-21', id: 'P-ENG-21', name: 'Folder templates', stage: 'UI', days: 1, waitingForMe: true }),
    card({ key: 'P-ENG-19', id: 'P-ENG-19', stage: 'Spec review', waitingForMe: true, openGate: gate({ missing: ['owner', 'engineer'] }) }),
    card({ key: 'P-ENG-30', id: 'P-ENG-30', stage: 'Intent', days: 3, waitingForMe: true }),
    card({ key: 'P-ENG-5', id: 'P-ENG-5', waitingForMe: false }),
  ];
  const rows = waitingRowsOf(cards, me(), AT);
  expect(rows.map((r) => [r.group, r.key, r.what, r.days, r.link?.href])).toEqual([
    ['Approve', 'P-ENG-19', 'Approve the spec: Spec review -> TDR, as owner', 4, '/gate/P-ENG-19/g1'],
    ['Decide', 'P-ENG-30', 'Write the intent', 3, '/f/P-ENG-30'],
    ['Decide', 'P-ENG-21', 'Draw and approve UI', 1, '/f/P-ENG-21'],
  ]);
  const eng = waitingRowsOf([cards[1]!], me({ engineer: true }), AT);
  expect(eng[0]!.what).toBe('Approve the spec: Spec review -> TDR, as owner and engineer');
});

test('waiting rows: PRs to review after the features, with or without a flow feature, then TDRs', () => {
  const pr = { repo: 'acme/frontend-core', title: 'Alert settings page', author: 'bo', updatedAt: '2026-11-24T09:00:00.000Z' };
  const rows = waitingRowsOf([card({ key: 'P-ENG-21', id: 'P-ENG-21', name: 'Folder templates', days: 1, waitingForMe: true })], me(), AT, {
    github: 'ok',
    prs: [
      { ...pr, number: 7, url: 'https://github.com/acme/boost/pull/7', repo: 'acme/boost', title: 'Fix routing', updatedAt: '2026-11-26T09:00:00.000Z', feature: null },
      { ...pr, number: 2301, url: 'https://github.com/acme/frontend-core/pull/2301', feature: { key: 'P-ENG-18', name: 'Usage alerts in Slack' } },
    ],
    tdrs: [{ title: 'Customer keys', path: 'documents/TDR/TDR Customer keys.md', url: null }],
  });
  expect(rows.map((r) => [r.group, r.id, r.name, r.what, r.ref, r.days, r.link?.text, r.link?.href])).toEqual([
    ['Decide', 'P-ENG-21', 'Folder templates', 'Review the spec', null, 1, 'Open', '/f/P-ENG-21'],
    ['Review code', 'P-ENG-18', 'Usage alerts in Slack', 'Alert settings page', 'frontend-core #2301', 2, 'Open PR', 'https://github.com/acme/frontend-core/pull/2301'],
    ['Review code', 'boost', 'Fix routing', 'by @bo', '#7', 0, 'Open PR', 'https://github.com/acme/boost/pull/7'],
    ['Review TDR', 'TDR', 'Customer keys', 'Read it, then tick your name under Reviewers.', null, null, undefined, undefined],
  ]);
});

test('filters: search by ID or name, owner, only stuck', () => {
  const cards = [
    card({ key: 'a', id: 'P-ENG-24', name: 'Meeting notes', owner: { name: 'Ken', email: 'ken@x.com' } }),
    card({ key: 'b', id: null, name: 'Export to CSV', owner: null, stuck: true }),
    card({ key: 'c', id: 'P-ENG-7', name: 'Guest limits', stuck: true }),
  ];
  const keys = (o: Partial<Parameters<typeof filterCards>[1]>) => filterCards(cards, { query: '', owner: '', stuck: false, ...o }).map((c) => c.key);
  expect(keys({})).toEqual(['a', 'b', 'c']);
  expect(keys({ query: 'eng-24' })).toEqual(['a']);
  expect(keys({ query: ' csv ' })).toEqual(['b']);
  expect(keys({ owner: 'mika@example.com' })).toEqual(['c']);
  expect(keys({ stuck: true })).toEqual(['b', 'c']);
  expect(keys({ stuck: true, query: 'guest' })).toEqual(['c']);
});

test('owners on the board, once each, by name', () => {
  const cards = [card({ owner: { name: 'Ken', email: 'ken@x.com' } }), card(), card({ owner: null }), card({ owner: { name: 'Ken', email: 'ken@x.com' } })];
  expect(ownersOf(cards)).toEqual([{ name: 'Ken', email: 'ken@x.com' }, { name: 'Mika', email: 'mika@example.com' }]);
});

test('summary counts features, stuck and the ones waiting for you', () => {
  expect(boardSummary([card(), card({ stuck: true, waitingForMe: true }), card({ waitingForMe: true })])).toBe('3 features, 1 stuck, 2 wait for you');
  expect(boardSummary([card()])).toBe('1 feature');
  expect(boardSummary([])).toBe('0 features');
});

test('small text helpers', () => {
  expect(daysText(0)).toBe('less than a day');
  expect(daysText(1)).toBe('1 day');
  expect(daysText(4)).toBe('4 days');
  expect(shortDate('2026-11-18')).toBe('Nov 18');
  expect(shortDate('2026-11-18T23:30:00.000Z')).toBe('Nov 18');
  expect(shortDate('')).toBe('');
  expect(initialsOf('Mika Sato')).toBe('MS');
  expect(initialsOf('mika.sato@jitera.com')).toBe('MS');
  expect(initialsOf('Mika')).toBe('M');
  expect(initialsOf('')).toBe('?');
  expect(firstNameOf('mika.sato@jitera.com')).toBe('Mika');
  expect(firstNameOf('sam@x.com')).toBe('Sam');
});
