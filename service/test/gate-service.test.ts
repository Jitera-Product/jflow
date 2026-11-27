import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { memoryChatTokenStore } from '../src/chats/memoryChatTokenStore.js';
import { openChatTokens } from '../src/chats/openChatTokens.js';
import { memoryFeatureChatStore } from '../src/featureChats/memoryFeatureChatStore.js';
import type { Config } from '../src/config/types.js';
import { memoryDocuments } from '../src/documents/memoryDocuments.js';
import type { Documents } from '../src/documents/types.js';
import { loadFeature } from '../src/feature/loadFeature.js';
import { startFeature } from '../src/feature/startFeature.js';
import type { Deps } from '../src/feature/types.js';
import { decideGate } from '../src/gates/decideGate.js';
import { openGate } from '../src/gates/openGate.js';
import type { Decision } from '../src/gates/types.js';
import { signRow } from '../src/gates/signRow.js';
import type { TrackerProject } from '../src/linear/types.js';
import { memorySettingsStore } from '../src/settings/memorySettingsStore.js';
import { openSettings } from '../src/settings/openSettings.js';
import { readGates } from '../src/status/readGates.js';
import { upsertGate } from '../src/status/upsertGate.js';

const TEMPLATES = fileURLToPath(new URL('../../templates', import.meta.url));
const FOLDER = 'documents/Flow/P-ENG-12 Export';
const STATUS = `${FOLDER}/0-status.md`;
const SPEC_DONE = '**Flagged concerns.**\n\n1. Format - Decide: Mika\n   Decision: CSV - Mika, 2026-11-20\n';
const SPEC_OPEN = '**Flagged concerns.**\n\n1. Format - Decide: Mika\n';

const config = { flowFolder: 'documents/Flow', templatesDir: TEMPLATES } as Config;
const ENGINEERS = ['mika@jitera.com', 'ken@jitera.com'];
const ORIGIN = 'https://flow.example.com';
const settings = await openSettings(memorySettingsStore(), 'k'.repeat(32), { engineers: ENGINEERS }, () => new Date());
await settings.save({ docsUrl: '', tdrFolder: '', teams: ['ENG'], engineers: ENGINEERS }, 'mika@jitera.com');
const chats = await openChatTokens(memoryChatTokenStore(), 'k'.repeat(32), [], () => new Date());

const PROJECT: TrackerProject = {
  id: 'uuid-12', identifier: 'P-ENG-12', name: 'Export', url: 'https://linear.app/x/project/export-abc',
  teams: ['ENG'], lead: { name: 'Mika', email: 'mika@jitera.com' }, flowLabel: 'flow:spec-review',
};

function fakeTracker(project: TrackerProject) {
  const t = {
    labels: project.flowLabel ? [project.flowLabel] : ([] as string[]),
    async getProject(ref: string) {
      return ref.toUpperCase() === project.identifier ? { ...project, flowLabel: t.labels[0] ?? null } : null;
    },
    async setFlowLabel(_id: string, label: string) { t.labels = [label]; },
  };
  return t;
}

const statusMd = readFileSync(`${TEMPLATES}/0-status.md`, 'utf8')
  .replaceAll('<PROJECT-ID>', 'P-ENG-12').replaceAll('<Project name>', 'Export').replaceAll('<project URL>', PROJECT.url);

let docs: Documents;
let tracker: ReturnType<typeof fakeTracker>;
let deps: Deps;

function setup(project: TrackerProject = PROJECT, spec = SPEC_DONE) {
  docs = memoryDocuments({ [STATUS]: statusMd, [`${FOLDER}/2-spec.md`]: spec, 'documents/Flow/P-ENG-1 Other/0-status.md': 'x' });
  tracker = fakeTracker(project);
  deps = { config, settings, chats, featureChats: memoryFeatureChatStore(), docs, tracker, now: () => new Date('2026-11-23T10:00:00Z') };
}
beforeEach(() => setup());

const decide = (gate: string, email: string, decision: Decision = 'approve') =>
  decideGate(deps, { project: 'P-ENG-12', gate, email, decision, channel: 'page' });
afterEach(() => { vi.restoreAllMocks(); });

describe('features', () => {
  it('loads the feature and its folder, not the folder of P-ENG-1', async () => {
    const f = await loadFeature(deps, 'P-ENG-12');
    expect(f).toMatchObject({ identifier: 'P-ENG-12', folder: FOLDER, status: statusMd });
    expect(f.files).toEqual(['0-status.md', '2-spec.md']);
  });
  it('asks for the project ID when the ref is not found', async () => {
    await expect(loadFeature(deps, 'https://linear.app/x/project/export-abc'))
      .rejects.toMatchObject({ code: 'not_found', message: expect.stringContaining('P-CORE-396') });
  });
  it('refuses a project of a team that is not enabled', async () => {
    setup({ ...PROJECT, teams: ['OPS'] });
    await expect(loadFeature(deps, 'P-ENG-12')).rejects.toMatchObject({ code: 'team_not_enabled' });
  });
  it('starts a feature: folder, files, log and flow:intent', async () => {
    setup({ ...PROJECT, identifier: 'P-ENG-13', name: 'Import', flowLabel: null });
    const f = await startFeature(deps, 'P-ENG-13', 'Flow agent (test)');
    expect(f.folder).toBe('documents/Flow/P-ENG-13 Import');
    expect(f.files).toEqual(['0-status.md', '1-intent.md']);
    expect(tracker.labels).toEqual(['flow:intent']);
    const md = (await docs.read('documents/Flow/P-ENG-13 Import/0-status.md'))!;
    expect(md).toContain('# Status - P-ENG-13 Import');
    expect(md).toContain('- 2026-11-23 - Intent - Flow agent (test) - folder created');
    expect(md).not.toContain('<stage>');
    expect(await docs.read('documents/Flow/P-ENG-13 Import/1-intent.md')).toContain('Linear: https://linear.app/x/project/export-abc');
  });
  it('two folders for one project: no_folder, names both', async () => {
    await docs.create('documents/Flow/P-ENG-12 Export copy/0-status.md', 'x');
    const e = await loadFeature(deps, 'P-ENG-12').catch((x) => x);
    expect(e).toMatchObject({ code: 'no_folder' });
    expect(e.message).toContain('P-ENG-12 Export/');
    expect(e.message).toContain('P-ENG-12 Export copy/');
  });
  it('start finishes a half-created folder and keeps its 1-intent.md', async () => {
    setup({ ...PROJECT, identifier: 'P-ENG-13', name: 'Import', flowLabel: null });
    await docs.create('documents/Flow/P-ENG-13 Import/1-intent.md', 'mine');
    const f = await startFeature(deps, 'P-ENG-13', 'Flow agent (test)');
    expect(f.folder).toBe('documents/Flow/P-ENG-13 Import');
    expect(await docs.read('documents/Flow/P-ENG-13 Import/0-status.md')).toContain('folder created');
    expect(await docs.read('documents/Flow/P-ENG-13 Import/1-intent.md')).toBe('mine');
  });
  it('start keeps an existing flow label', async () => {
    setup({ ...PROJECT, identifier: 'P-ENG-13', name: 'Import', flowLabel: 'flow:spec' });
    await startFeature(deps, 'P-ENG-13', 'Flow agent (test)');
    expect(tracker.labels).toEqual(['flow:spec']);
  });
});

describe('gates', () => {
  it('opens a signed gate and returns the confirm link', async () => {
    const g = await openGate(deps, 'P-ENG-12', 'flow:plan', ORIGIN);
    expect(g).toMatchObject({ from: 'flow:spec-review', to: 'flow:plan', roles: ['owner'] });
    expect(g.url).toBe(`https://flow.example.com/gate/P-ENG-12/${g.gate}`);
    expect(readGates((await docs.read(STATUS))!)).toHaveLength(1);
  });
  it('the link uses the origin of the request; with none it refuses and writes nothing', async () => {
    expect((await openGate(deps, 'P-ENG-12', 'flow:plan', 'http://localhost:8080')).url).toMatch(/^http:\/\/localhost:8080\/gate\/P-ENG-12\//);
    setup(PROJECT);
    const before = await docs.read(STATUS);
    await expect(openGate(deps, 'P-ENG-12', 'flow:plan', null)).rejects.toMatchObject({ code: 'not_configured' });
    expect(await docs.read(STATUS)).toBe(before);
  });
  it('refuses to open while a concern has no decision', async () => {
    setup(PROJECT, SPEC_OPEN);
    await expect(openGate(deps, 'P-ENG-12', 'flow:plan', ORIGIN)).rejects.toMatchObject({ code: 'not_ready' });
  });
  it('a spec that needs a TDR can only open the gate to flow:tdr', async () => {
    setup(PROJECT, `**TDR.** Needed for the queue, because it is a new service.\n\n${SPEC_DONE}`);
    for (const to of ['flow:plan', 'flow:ui']) {
      const e = await openGate(deps, 'P-ENG-12', to, ORIGIN).catch((x) => x);
      expect(e).toMatchObject({ code: 'not_ready' });
      expect(e.message).toContain('flow:tdr');
    }
    expect((await openGate(deps, 'P-ENG-12', 'flow:tdr', ORIGIN)).to).toBe('flow:tdr');
    setup(PROJECT, `**TDR.** Not needed.\n\n${SPEC_DONE}`);
    expect((await openGate(deps, 'P-ENG-12', 'flow:plan', ORIGIN)).to).toBe('flow:plan');
  });
  it('refuses to open while the plan has an open technical question', async () => {
    setup({ ...PROJECT, flowLabel: 'flow:plan' });
    await docs.create(`${FOLDER}/3-plan.md`, '**Open technical questions.**\n- Which queue?\n');
    await expect(openGate(deps, 'P-ENG-12', 'flow:build', ORIGIN)).rejects.toMatchObject({ code: 'not_ready' });
  });
  it('refuses a move that is not a gate', async () => {
    await expect(openGate(deps, 'P-ENG-12', 'flow:build', ORIGIN)).rejects.toMatchObject({ code: 'not_allowed' });
    await expect(openGate(deps, 'P-ENG-12', 'flow:spec', ORIGIN)).rejects.toMatchObject({ code: 'not_allowed' });
  });
  it('opening the same move twice returns the same gate; another move replaces it', async () => {
    const a = await openGate(deps, 'P-ENG-12', 'flow:plan', ORIGIN);
    const b = await openGate(deps, 'P-ENG-12', 'flow:plan', ORIGIN);
    expect(b.gate).toBe(a.gate);
    const c = await openGate(deps, 'P-ENG-12', 'flow:tdr', ORIGIN);
    expect(c.gate).not.toBe(a.gate);
    const rows = readGates((await docs.read(STATUS))!);
    expect(rows.map((r) => [r.id, r.status])).toEqual([[a.gate, 'replaced'], [c.gate, 'open']]);
    await expect(decide(a.gate, 'mika@jitera.com')).rejects.toMatchObject({ code: 'closed' });
  });
  it('the owner approves: label moves, stages and log update', async () => {
    const g = await openGate(deps, 'P-ENG-12', 'flow:plan', ORIGIN);
    const d = await decide(g.gate, 'Mika@jitera.com');
    expect(d).toEqual({ status: 'approved', missing: [] });
    expect(tracker.labels).toEqual(['flow:plan']);
    const md = (await docs.read(STATUS))!;
    expect(md).toMatch(/\| Spec review \| done \|/);
    expect(md).toMatch(/\| TDR \| skipped \|/);
    expect(md).toMatch(/\| UI \| skipped \|/);
    expect(md).toMatch(/\| Plan \| in progress \|/);
    expect(md).toContain('- 2026-11-23 - Spec review approved - mika@jitera.com via page');
    expect(readGates(md)[0]).toMatchObject({ status: 'approved', decidedBy: 'mika@jitera.com' });
  });
  it('writes one audit line before the label moves, with no secret in it', async () => {
    const g = await openGate(deps, 'P-ENG-12', 'flow:plan', ORIGIN);
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    let linesAtMove = -1;
    const set = tracker.setFlowLabel;
    tracker.setFlowLabel = async (id, label) => { linesAtMove = log.mock.calls.length; return set(id, label); };
    await decideGate(deps, { project: 'P-ENG-12', gate: g.gate, email: 'Mika@jitera.com', decision: 'approve', channel: 'chat' });
    expect(log).toHaveBeenCalledTimes(1);
    expect(linesAtMove).toBe(1);
    const line = log.mock.calls[0]![0] as string;
    expect(line).not.toContain('\n');
    expect(line).not.toContain(settings.get().gateSecret);
    expect(JSON.parse(line)).toEqual({
      audit: 'gate', project: 'P-ENG-12', gate: g.gate, from: 'flow:spec-review', to: 'flow:plan',
      email: 'mika@jitera.com', decision: 'approve', channel: 'chat',
    });
  });
  it('the label moved but the status write failed: closed, the row is not marked stale', async () => {
    const g = await openGate(deps, 'P-ENG-12', 'flow:plan', ORIGIN);
    vi.spyOn(console, 'log').mockImplementation(() => {});
    const update = docs.update;
    let fail = true;
    deps = { ...deps, docs: { ...docs, async update(path, text) {
      if (fail && path === STATUS) { fail = false; throw new Error('docs down'); }
      return update(path, text);
    } } };
    await expect(decide(g.gate, 'mika@jitera.com')).rejects.toThrow('docs down');
    expect(tracker.labels).toEqual(['flow:plan']);
    const e = await decide(g.gate, 'mika@jitera.com').catch((x) => x);
    expect(e).toMatchObject({ code: 'closed' });
    expect(e.message).toContain('already passed');
    expect(e.message).toContain('status file');
    expect(readGates((await docs.read(STATUS))!)[0]!.status).toBe('open');
  });
  it('refuses a decision for another move than the one the person saw', async () => {
    const g = await openGate(deps, 'P-ENG-12', 'flow:plan', ORIGIN);
    await expect(decideGate(deps, { project: 'P-ENG-12', gate: g.gate, email: 'mika@jitera.com', decision: 'approve', channel: 'page', expectedTo: 'flow:tdr' }))
      .rejects.toMatchObject({ code: 'mismatch' });
    expect(tracker.labels).toEqual(['flow:spec-review']);
    expect(readGates((await docs.read(STATUS))!)[0]!.status).toBe('open');
  });
  it('a person who is neither owner nor engineer is refused', async () => {
    const g = await openGate(deps, 'P-ENG-12', 'flow:plan', ORIGIN);
    await expect(decide(g.gate, 'eve@jitera.com')).rejects.toMatchObject({ code: 'not_allowed' });
    await expect(decide(g.gate, 'ken@jitera.com')).rejects.toMatchObject({ code: 'not_allowed' }); // engineer, but owner gate
    expect(tracker.labels).toEqual(['flow:spec-review']);
  });
  it('spec to TDR needs two different people', async () => {
    const g = await openGate(deps, 'P-ENG-12', 'flow:tdr', ORIGIN);
    expect(await decide(g.gate, 'mika@jitera.com')).toEqual({ status: 'open', missing: ['engineer'] });
    expect(await decide(g.gate, 'MIKA@jitera.com')).toEqual({ status: 'open', missing: ['engineer'] });
    expect(tracker.labels).toEqual(['flow:spec-review']);
    expect(await decide(g.gate, 'ken@jitera.com')).toEqual({ status: 'approved', missing: [] });
    expect(tracker.labels).toEqual(['flow:tdr']);
  });
  it('a row that changes between the first read and the last approval is stale', async () => {
    const g = await openGate(deps, 'P-ENG-12', 'flow:tdr', ORIGIN);
    await decide(g.gate, 'mika@jitera.com');
    // The second read of 0-status.md (the re-read before the write) first sees another valid change.
    let reads = 0;
    const inner = docs;
    deps = { ...deps, docs: { ...inner, async read(path) {
      if (path === STATUS && ++reads === 2) {
        const md = (await inner.read(STATUS))!;
        const row = readGates(md)[0]!;
        const changed = { ...row, approvals: [{ role: 'owner' as const, email: 'other@jitera.com' }] };
        await inner.update(STATUS, upsertGate(md, { ...changed, sig: signRow(settings.get().gateSecret, 'P-ENG-12', changed) }));
      }
      return inner.read(path);
    } } };
    await expect(decide(g.gate, 'ken@jitera.com')).rejects.toMatchObject({ code: 'stale' });
    expect(tracker.labels).toEqual(['flow:spec-review']);
  });
  it('a hand-edited row is refused as invalid', async () => {
    const g = await openGate(deps, 'P-ENG-12', 'flow:tdr', ORIGIN);
    const md = (await docs.read(STATUS))!;
    const row = readGates(md)[0]!;
    await docs.update(STATUS, upsertGate(md, { ...row, approvals: [{ role: 'owner', email: 'mika@jitera.com' }] }));
    await expect(decide(g.gate, 'ken@jitera.com')).rejects.toMatchObject({ code: 'invalid' });
    expect(tracker.labels).toEqual(['flow:spec-review']);
  });
  it('a label moved by hand makes the gate stale', async () => {
    const g = await openGate(deps, 'P-ENG-12', 'flow:plan', ORIGIN);
    tracker.labels = ['flow:intent'];
    await expect(decide(g.gate, 'mika@jitera.com')).rejects.toMatchObject({ code: 'stale' });
    expect(readGates((await docs.read(STATUS))!)[0]!.status).toBe('stale');
    expect(tracker.labels).toEqual(['flow:intent']);
    await expect(decide(g.gate, 'mika@jitera.com')).rejects.toMatchObject({ code: 'closed' }); // still signed
  });
  it('request changes closes the gate and keeps the label', async () => {
    const g = await openGate(deps, 'P-ENG-12', 'flow:plan', ORIGIN);
    expect(await decide(g.gate, 'Mika@jitera.com', 'changes')).toEqual({ status: 'changes requested', missing: ['owner'] });
    expect(tracker.labels).toEqual(['flow:spec-review']);
    const md = (await docs.read(STATUS))!;
    expect(readGates(md)[0]).toMatchObject({ status: 'changes requested', decidedBy: 'mika@jitera.com' });
    expect(md).toContain('- 2026-11-23 - Spec review changes requested - mika@jitera.com via page');
  });
  it('a closed gate refuses another decision', async () => {
    const g = await openGate(deps, 'P-ENG-12', 'flow:plan', ORIGIN);
    await decide(g.gate, 'mika@jitera.com');
    await expect(decide(g.gate, 'mika@jitera.com')).rejects.toMatchObject({ code: 'closed' });
    await expect(decide('gnope', 'mika@jitera.com')).rejects.toMatchObject({ code: 'not_found' });
  });
});
