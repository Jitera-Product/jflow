import { readFileSync } from 'node:fs';
import { it, expect } from 'vitest';
import { newGateId } from '../src/gates/newGateId.js';
import { nextApproval } from '../src/gates/nextApproval.js';
import { openTechQuestions } from '../src/gates/openTechQuestions.js';
import { rolesFor } from '../src/gates/rolesFor.js';
import { rowIsValid } from '../src/gates/rowIsValid.js';
import { signRow } from '../src/gates/signRow.js';
import { undecidedConcerns } from '../src/gates/undecidedConcerns.js';
import type { GateRow } from '../src/status/stages.js';

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');
const S = 's'.repeat(32);
const P = 'P-ENG-12';
const OPEN_ROW: Omit<GateRow, 'sig'> = {
  id: 'gabcdefghij', from: 'flow:spec-review', to: 'flow:tdr', roles: ['owner', 'engineer'],
  opened: '2026-11-23T10:00:00.000Z', status: 'open', approvals: [], decidedBy: '',
};

it('needs owner and engineer when the spec goes to a TDR', () => {
  expect(rolesFor('flow:spec-review', 'flow:tdr')).toEqual(['owner', 'engineer']);
  expect(rolesFor('flow:spec-review', 'flow:plan')).toEqual(['owner']);
  expect(rolesFor('flow:tdr', 'flow:plan')).toEqual(['engineer']);
});
it('one person fills one role only', () => {
  const row = { ...OPEN_ROW, sig: '', approvals: [{ role: 'owner' as const, email: 'mika@jitera.com' }] };
  expect(nextApproval(row, 'MIKA@jitera.com', ['owner', 'engineer'])).toBeNull();
  expect(nextApproval(row, 'ken@jitera.com', ['engineer'])).toBe('engineer');
  expect(nextApproval(row, 'ken@jitera.com', ['owner'])).toBeNull();
});
it('a hand-edited row is invalid', () => {
  const row = { ...OPEN_ROW, sig: signRow(S, P, OPEN_ROW) };
  expect(rowIsValid(S, P, row)).toBe(true);
  expect(rowIsValid(S, P, { ...row, approvals: [{ role: 'owner', email: 'x@y.z' }] })).toBe(false);
  expect(rowIsValid(S, P, { ...row, sig: 'short' })).toBe(false);
});
it('a row signed for one project is invalid for another', () => {
  const row = { ...OPEN_ROW, sig: signRow(S, 'P-ENG-12', OPEN_ROW) };
  expect(rowIsValid(S, 'P-ENG-12', row)).toBe(true);
  expect(rowIsValid(S, 'P-ENG-13', row)).toBe(false);
});
it('makes gate ids', () => {
  expect(newGateId()).toMatch(/^g[a-z2-7]{10}$/);
});
it('finds concerns without a decision and open technical questions', () => {
  expect(undecidedConcerns(read('./fixtures/spec-one-open.md'))).toEqual(['2. Retention period - Decide: Alex']);
  expect(undecidedConcerns(read('../../templates/2-spec.md'))).toEqual([]);
  expect(openTechQuestions(read('../../templates/3-plan.md'))).toEqual([]);
  expect(openTechQuestions(read('./fixtures/plan-with-one.md'))).toEqual(['- Which queue lib?']);
});
it('a Decision: Undecided line is not a decision', () => {
  const spec = '**Flagged concerns.**\n\n1. Format - Decide: Mika\n   Decision: undecided\n2. Size - Decide: Ken\n   Decision: UNDECIDED - Ken, 2026-11-20\n';
  expect(undecidedConcerns(spec)).toEqual(['1. Format - Decide: Mika', '2. Size - Decide: Ken']);
});
