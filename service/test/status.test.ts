import { readFileSync } from 'node:fs';
import { it, expect } from 'vitest';
import { rowIsValid } from '../src/gates/rowIsValid.js';
import { appendLog } from '../src/status/appendLog.js';
import { readGates } from '../src/status/readGates.js';
import { setStage } from '../src/status/setStage.js';
import { upsertGate } from '../src/status/upsertGate.js';
import type { GateRow } from '../src/status/stages.js';

const read = (p: string) => readFileSync(new URL(p, import.meta.url), 'utf8');
const TEMPLATE = read('../../templates/0-status.md');
const OLD = read('./fixtures/old-status.md');
const OLD_LOG = OLD.slice(OLD.indexOf('## Log'));
const ROW: GateRow = {
  id: 'gabcdefghij', from: 'flow:spec-review', to: 'flow:tdr', roles: ['owner', 'engineer'],
  opened: '2026-11-23T10:00:00.000Z', status: 'open',
  approvals: [{ role: 'owner', email: 'a@x.com' }], decidedBy: '', sig: 'abc123',
};

it('adds the UI row before Plan and a Gates section before Log in an old file', () => {
  const out = setStage(OLD, 'UI', 'in progress', '2026-11-23', 'Flow agent (jitera-flow-agent)');
  expect(out).toMatch(/\| TDR \|[^\n]*\n\| 5 \| UI \| in progress \|[^\n]*\n\| 6 \| Plan \|[^\n]*\n\| 7 \| Build \|[^\n]*\n\| 8 \| Verify \|[^\n]*\n\| 9 \| Done \|/);
  expect(upsertGate(out, ROW)).toMatch(/## Gates\n\n\| Gate \|[\s\S]*## Log/);
  expect(out).toContain(OLD_LOG);
  expect(out).toContain('## Build');
});
it('sets an existing stage in place', () => {
  const out = setStage(TEMPLATE, 'Spec', 'done', '2026-11-23', 'Mika');
  expect(out).toContain('| 2 | Spec | done | 2-spec.md | 2026-11-23 | Mika |');
});
it('appends a log line and drops the template placeholder', () => {
  const out = appendLog(TEMPLATE, '2026-11-23 - Intent - Flow agent (jitera-flow-agent) - folder created');
  expect(out).not.toContain('- YYYY-MM-DD - <stage>');
  expect(out.trimEnd().endsWith('- 2026-11-23 - Intent - Flow agent (jitera-flow-agent) - folder created')).toBe(true);
});
it('round-trips a gate row', () => {
  expect(readGates(upsertGate(TEMPLATE, ROW))).toEqual([ROW]);
  expect(readGates(upsertGate(upsertGate(TEMPLATE, ROW), { ...ROW, status: 'approved' }))).toHaveLength(1);
  expect(readGates(upsertGate(TEMPLATE, { ...ROW, approvals: [], roles: ['owner'] }))[0]!.approvals).toEqual([]);
});
it('refuses a pipe in a cell', () => {
  expect(() => upsertGate(TEMPLATE, { ...ROW, decidedBy: 'a|b' })).toThrow();
});
it('a row with missing cells reads back and is invalid, no throw', () => {
  const md = upsertGate(TEMPLATE, ROW).replace(/\n\| gabcdefghij \|[^\n]*/, '\n| gabcdefghij | flow:spec-review |');
  const [row] = readGates(md);
  expect(row!.id).toBe('gabcdefghij');
  expect(rowIsValid('s'.repeat(32), 'P-ENG-12', row!)).toBe(false);
});
it('refuses a line break in a log line and a pipe in by', () => {
  expect(() => appendLog(TEMPLATE, 'a\nb')).toThrow();
  expect(() => setStage(TEMPLATE, 'Spec', 'done', '2026-11-23', 'a|b')).toThrow();
});
