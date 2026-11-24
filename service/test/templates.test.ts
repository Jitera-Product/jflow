import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { it, expect } from 'vitest';
import { STAGES } from '../src/status/stages.js';

const read = (p: string) => readFileSync(p, 'utf8');

function files(path: string): string[] {
  if (!statSync(path).isDirectory()) return [path];
  return readdirSync(path).flatMap((n) => files(join(path, n)));
}

it('every template and skill avoids em and en dashes', () => {
  const all = ['../templates', '../skills', '../CONVENTIONS.md', 'agent'].flatMap(files);
  expect(all.length).toBeGreaterThan(5);
  for (const f of all) expect(read(f), f).not.toMatch(/[\u2013\u2014]/);
});

it('the status template has every stage once, UI before Plan, and a Gates section', () => {
  const md = read('../templates/0-status.md');
  for (const s of STAGES) expect(md.match(new RegExp(`\\| ${s} \\|`, 'g'))).toHaveLength(1);
  expect(md.indexOf('| UI |')).toBeLessThan(md.indexOf('| Plan |'));
  expect(md).toContain('| Gate | From | To | Roles | Opened | Status | Approved by | Decided by | Sig |');
});

it('the 2-ui template has the screens table', () => {
  expect(read('../templates/2-ui.md')).toContain('| Screen | State | File |');
});
