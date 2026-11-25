import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Config } from '../src/config/types.js';
import { memoryDocuments } from '../src/documents/memoryDocuments.js';
import type { Documents } from '../src/documents/types.js';
import { liveDocuments } from '../src/documents/liveDocuments.js';
import type { Deps } from '../src/feature/types.js';
import { liveTracker } from '../src/linear/liveTracker.js';
import type { TrackerProject } from '../src/linear/types.js';
import { buildMcpServer } from '../src/mcp/buildMcpServer.js';
import { memorySettingsStore } from '../src/settings/memorySettingsStore.js';
import { openSettings } from '../src/settings/openSettings.js';

const TEMPLATES = fileURLToPath(new URL('../../templates', import.meta.url));
const FOLDER = 'documents/Flow/P-ENG-12 Export';
const STATUS = `${FOLDER}/0-status.md`;
const SPEC_DONE = '**Flagged concerns.**\n\n1. Format - Decide: Mika\n   Decision: CSV - Mika, 2026-11-20\n';

const config = {
  publicUrl: 'https://flow.example.com', flowFolder: 'documents/Flow', templatesDir: TEMPLATES,
  gateSecret: 's'.repeat(32),
} as Config;
const NOW = () => new Date('2026-11-23T10:00:00Z');
const ENGINEERS = ['mika@jitera.com', 'ken@jitera.com'];
const settings = await openSettings(memorySettingsStore(), 'k'.repeat(32), ENGINEERS, NOW);
await settings.save({ docsUrl: '', jiteraProject: '', teams: ['ENG'], engineers: ENGINEERS }, 'mika@jitera.com');

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
let client: Client;

async function setup(project: TrackerProject = PROJECT) {
  docs = memoryDocuments({ [STATUS]: statusMd, [`${FOLDER}/2-spec.md`]: SPEC_DONE });
  tracker = fakeTracker(project);
  await connect({ config, settings, docs, tracker, now: NOW });
}
async function connect(deps: Deps) {
  const [a, b] = InMemoryTransport.createLinkedPair();
  await buildMcpServer(deps, 'test').connect(b);
  client = new Client({ name: 'c', version: '1' });
  await client.connect(a);
}
beforeEach(() => setup());

type R = { isError?: boolean; content: Array<{ text: string }> };
const call = async (name: string, args: Record<string, unknown>) => (await client.callTool({ name, arguments: { project: 'P-ENG-12', ...args } })) as R;
const json = (r: R) => JSON.parse(r.content[0]!.text);

describe('mcp tools', () => {
  it('lists exactly the flow tools', async () => {
    expect((await client.listTools()).tools.map((t) => t.name).sort()).toEqual(
      ['log_stage', 'open_gate', 'read_feature', 'read_file', 'save_ui_handoff', 'set_stage', 'start_feature', 'write_file']);
  });
  it('read_feature hides signatures', async () => {
    await call('open_gate', { to: 'flow:plan' });
    const f = json(await call('read_feature', {}));
    expect(f).toMatchObject({ identifier: 'P-ENG-12', folder: FOLDER });
    expect(f.gates).toHaveLength(1);
    expect(f.gates[0]).not.toHaveProperty('sig');
  });
  it('start_feature creates the folder', async () => {
    await setup({ ...PROJECT, identifier: 'P-ENG-13', name: 'Import', flowLabel: null });
    const f = json(await call('start_feature', { project: 'P-ENG-13' }));
    expect(f.folder).toBe('documents/Flow/P-ENG-13 Import');
    expect(await docs.read('documents/Flow/P-ENG-13 Import/0-status.md')).toContain('Flow agent (test) - folder created');
  });
  it('read_file reads and reports a missing file', async () => {
    expect(json(await call('read_file', { file: '2-spec.md' }))).toEqual({ file: '2-spec.md', content: SPEC_DONE });
    const r = await call('read_file', { file: '3-plan.md' });
    expect(r.isError).toBe(true);
    expect(r.content[0]!.text).toBe('not_found: 3-plan.md');
  });
  it('write_file creates then updates', async () => {
    expect(json(await call('write_file', { file: '3-plan.md', content: 'a' }))).toEqual({ file: '3-plan.md', created: true });
    expect(json(await call('write_file', { file: '3-plan.md', content: 'b' }))).toEqual({ file: '3-plan.md', created: false });
    expect(await docs.read(`${FOLDER}/3-plan.md`)).toBe('b');
    expect(json(await call('write_file', { file: '2-ui/README.md', content: 'u' })).created).toBe(true);
    expect(json(await call('write_file', { file: '2-ui/README.md', content: 'v' })).created).toBe(false);
  });
  it('refuses to write 0-status.md or other files', async () => {
    const r = await call('write_file', { file: '0-status.md', content: 'x' });
    expect(r.isError).toBe(true);
    expect(r.content[0]!.text).toBe('write_file: 0-status.md is not a stage file');
    expect(await docs.read(STATUS)).toBe(statusMd);
  });
  it('refuses a path outside the folder', async () => {
    for (const file of ['../TDR x.md', '/etc/passwd', 'a\\b', '', 'a/../b']) {
      expect((await call('read_file', { file })).isError).toBe(true);
      const w = await call('write_file', { file, content: 'x' });
      expect(w.isError).toBe(true);
      expect(w.content[0]!.text).toBe(`write_file: ${file} is not a stage file`);
    }
  });
  it('no folder gives no_folder', async () => {
    await setup({ ...PROJECT, identifier: 'P-ENG-13', name: 'Import', flowLabel: null });
    const r = await call('read_file', { project: 'P-ENG-13', file: '1-intent.md' });
    expect(r.isError).toBe(true);
    expect(r.content[0]!.text).toMatch(/^no_folder: /);
  });
  it('log_stage sets the stage and adds one log line', async () => {
    expect(json(await call('log_stage', { stage: 'Spec', status: 'in progress', note: 'drafted' }))).toEqual({ ok: true });
    const md = (await docs.read(STATUS))!;
    expect(md).toMatch(/\| Spec \| in progress \| 2-spec.md \| 2026-11-23 \| Flow agent \(test\) \|/);
    expect(md).toContain('- 2026-11-23 - Spec - Flow agent (test) - drafted');
  });
  it('log_stage refuses a note with a pipe or line break', async () => {
    expect((await call('log_stage', { stage: 'Spec', status: 'done', note: 'a | b' })).isError).toBe(true);
    expect((await call('log_stage', { stage: 'Spec', status: 'done', note: 'a\nb' })).isError).toBe(true);
    expect(await docs.read(STATUS)).toBe(statusMd);
  });
  it('set_stage makes an agent move', async () => {
    await setup({ ...PROJECT, flowLabel: 'flow:spec' });
    expect(json(await call('set_stage', { to: 'flow:spec-review' }))).toEqual({ from: 'flow:spec', to: 'flow:spec-review' });
    expect(tracker.labels).toEqual(['flow:spec-review']);
    const md = (await docs.read(STATUS))!;
    expect(md).toMatch(/\| Spec \| done \|/);
    expect(md).toMatch(/\| Spec review \| in progress \|/);
    expect(md).toContain('- 2026-11-23 - Spec review - Flow agent (test) - stage set to flow:spec-review');
  });
  it('set_stage cannot pass a gate', async () => {
    const r = await call('set_stage', { to: 'flow:plan' });
    expect(r.isError).toBe(true);
    expect(r.content[0]!.text).toBe('set_stage: flow:spec-review -> flow:plan is not an agent move. Allowed: none. Gates go through open_gate.');
    expect(tracker.labels).toEqual(['flow:spec-review']);
  });
  it('open_gate returns the line to show', async () => {
    const g = json(await call('open_gate', { to: 'flow:plan' }));
    expect(g.say).toBe(`Approve here: ${g.url}`);
    expect(g).toMatchObject({ project: 'P-ENG-12', from: 'flow:spec-review', to: 'flow:plan' }); // what a chat host renders the card from
    expect(g.url).toBe(`https://flow.example.com/gate/P-ENG-12/${g.gate}`);
    const bad = await call('open_gate', { to: 'flow:build' });
    expect(bad.isError).toBe(true);
    expect(bad.content[0]!.text).toMatch(/^not_allowed: /);
  });
  it('save_ui_handoff writes the README with one row per screen', async () => {
    const screens = [{ name: 'List', state: 'empty', file: 'uploads/list.png' }, { name: 'List', state: 'full', file: 'uploads/list2.png' }];
    expect(json(await call('save_ui_handoff', { link: 'https://figma.com/x', screens }))).toEqual({ file: '2-ui/README.md' });
    const md = (await docs.read(`${FOLDER}/2-ui/README.md`))!;
    expect(md).toContain('# UI - P-ENG-12 Export');
    expect(md).toContain('Handoff: https://figma.com/x');
    expect(md).toContain('| --- | --- | --- |\n| List | empty | uploads/list.png |\n| List | full | uploads/list2.png |');
    await call('save_ui_handoff', { link: 'https://figma.com/y', screens: [screens[0]] });
    expect(await docs.read(`${FOLDER}/2-ui/README.md`)).toContain('Handoff: https://figma.com/y');
  });
  it('save_ui_handoff keeps $ patterns in the link literally', async () => {
    await call('save_ui_handoff', { link: 'https://x/$`a$&b', screens: [] });
    expect(await docs.read(`${FOLDER}/2-ui/README.md`)).toContain('Handoff: https://x/$`a$&b\n');
  });
  it('set_stage writes the status text as it is after the label call', async () => {
    await setup({ ...PROJECT, flowLabel: 'flow:spec' });
    const inner = docs;
    const base = tracker.setFlowLabel;
    tracker.setFlowLabel = async (id, label) => {
      await base(id, label);
      await inner.update(STATUS, (await inner.read(STATUS))! + '\n<!-- edited meanwhile -->\n');
    };
    await call('set_stage', { to: 'flow:spec-review' });
    expect(await docs.read(STATUS)).toContain('edited meanwhile');
  });
  it('a tool returns not_configured when settings are empty', async () => {
    const blank = await openSettings(memorySettingsStore(), 'k'.repeat(32), ENGINEERS, NOW);
    await connect({
      config, settings: blank, docs: liveDocuments(blank, config.documents, config.publicUrl), tracker: liveTracker(blank, config.publicUrl), now: NOW,
    });
    const r = await call('read_feature', {});
    expect(r.isError).toBe(true);
    expect(r.content[0]!.text).toMatch(/^not_configured: /);
  });
  it('save_ui_handoff refuses a cell with a pipe', async () => {
    const r = await call('save_ui_handoff', { link: 'l', screens: [{ name: 'a|b', state: 's', file: 'f' }] });
    expect(r.isError).toBe(true);
    expect(await docs.read(`${FOLDER}/2-ui/README.md`)).toBeNull();
  });
});
