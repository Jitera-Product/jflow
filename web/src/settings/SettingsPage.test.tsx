import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';
import type { SettingsView, SetupView } from '@/api/types';
import { bodyOf, callsTo, reply, routeFetch } from '@/test/routeFetch';
import { SettingsPage } from './SettingsPage';

const view: SettingsView = {
  email: 'mika@example.com',
  settings: {
    docsUrl: 'https://docs.example.com/mcp',
    jiteraProject: 'proj-1',
    docsTokenSet: true,
    linearApiKeySet: false,
    teams: ['CORE'],
    engineers: ['mika@example.com', 'sam@example.com'],
    publicUrl: 'https://flow.example.com',
    tdrFolder: 'Technical Design Record (TDR)',
    productDocs: 'TDR and Specs',
    compliance: 'ISMAP',
    updatedBy: 'sam@example.com',
    updatedAt: '2026-11-20T10:00:00.000Z',
  },
};

const withKey: SettingsView = { ...view, settings: { ...view.settings, linearApiKeySet: true } };

const setup: SetupView = {
  linear: { ok: true },
  jitera: { ok: false, message: 'Could not read the Jitera documents. Check the URL, project and token.' },
  chats: { ok: false },
};

const base = {
  'GET /api/settings': reply(200, view),
  'GET /api/setup': reply(200, setup),
  'GET /api/chats': reply(200, { chats: [] }),
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test('checklist shows Linear, Jitera and Chats from /api/setup, each linking to its section', async () => {
  routeFetch(base);
  render(<SettingsPage />);
  const list = await screen.findByRole('list', { name: 'Setup' });
  await vi.waitFor(() => expect(within(list).getByRole('link', { name: /Linear/ }).textContent).toContain('Done'));
  const links = within(list).getAllByRole('link');
  expect(links.map((a) => a.getAttribute('href'))).toEqual(['#linear', '#jitera', '#chats']);
  expect(links[0]!.textContent).not.toContain('Not done');
  expect(links[1]!.textContent).toContain('Not done');
  expect(links[2]!.textContent).toContain('Not done');
  for (const id of ['linear', 'jitera', 'chats']) expect(document.getElementById(id)).toBeTruthy();
});

test('loaded values show, secrets only as "Set"', async () => {
  const f = routeFetch({ ...base, 'GET /api/settings': reply(200, { ...view, settings: { ...view.settings, docsToken: 'tok-secret-1' } }) }); // as if the service leaked it
  render(<SettingsPage />);
  expect(((await screen.findByLabelText('Jitera MCP URL')) as HTMLInputElement).value).toBe('https://docs.example.com/mcp');
  expect((screen.getByLabelText('Project for flow documents') as HTMLInputElement).value).toBe('proj-1');
  expect((screen.getByLabelText('TDR folder') as HTMLInputElement).value).toBe('Technical Design Record (TDR)');
  expect((screen.getByLabelText('Product docs to search for context') as HTMLInputElement).value).toBe('TDR and Specs');
  expect((screen.getByLabelText('Compliance to check in specs and TDRs') as HTMLInputElement).value).toBe('ISMAP');
  expect((screen.getByLabelText(/Engineers/) as HTMLTextAreaElement).value).toBe('mika@example.com\nsam@example.com');
  const token = screen.getByLabelText('Jitera token') as HTMLInputElement;
  expect(token.type).toBe('password');
  expect(token.value).toBe('');
  expect(token.placeholder).toBe('Set, leave blank to keep');
  expect((screen.getByLabelText('Linear API key') as HTMLInputElement).placeholder).toBe('Not set');
  expect(screen.getByText(/Last saved by sam@example.com,/)!.textContent).toBe(`Last saved by sam@example.com, ${new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date('2026-11-20T10:00:00.000Z'))}`);
  expect(f).toHaveBeenCalledWith('/api/settings', expect.objectContaining({ credentials: 'same-origin' }));
  expect(document.body.innerHTML).not.toContain('tok-secret-1');
});

test('Linear: without a key it asks for one; after the key is saved, teams are checkboxes and missing labels can be created', async () => {
  const f = routeFetch({
    ...base,
    'POST /api/settings': reply(200, withKey),
    'GET /api/linear/teams': reply(200, { teams: [{ key: 'CORE', name: 'Core' }, { key: 'OPS', name: 'Operations' }] }),
    'GET /api/linear/labels': reply(200, { missing: ['flow:tdr', 'flow:spec'] }),
    'POST /api/linear/labels': reply(200, { missing: [] }),
  });
  const user = userEvent.setup();
  render(<SettingsPage />);
  const linear = await screen.findByRole('region', { name: 'Linear' });
  expect(within(linear).getByText('Save the Linear key first.')).toBeTruthy();
  expect(callsTo(f, 'GET', '/api/linear/teams')).toHaveLength(0);

  await user.type(within(linear).getByLabelText('Linear API key'), 'lin_api_1');
  await user.click(within(linear).getByRole('button', { name: 'Save' }));
  expect(bodyOf(f, 'POST', '/api/settings').linearApiKey).toBe('lin_api_1');

  const ops = (await within(linear).findByRole('checkbox', { name: /Operations/ })) as HTMLInputElement;
  expect((within(linear).getByRole('checkbox', { name: /Core/ }) as HTMLInputElement).checked).toBe(true);
  expect(ops.checked).toBe(false);
  expect(within(linear).queryByText('Save the Linear key first.')).toBeNull();

  await user.click(await within(linear).findByRole('button', { name: 'Create 2 labels' }));
  expect(await within(linear).findByText('All flow labels exist.')).toBeTruthy();
  expect(callsTo(f, 'POST', '/api/linear/labels')[0]![1]).toMatchObject({ credentials: 'same-origin', headers: { 'content-type': 'application/json' } });
  expect(within(linear).queryByRole('button', { name: /Create/ })).toBeNull();

  await user.click(ops);
  await user.click(within(linear).getByRole('button', { name: 'Save' }));
  await vi.waitFor(() => expect(bodyOf(f, 'POST', '/api/settings', 1).teams).toEqual(['CORE', 'OPS']));
});

test('Linear: a 409 no_key from the teams list asks to save the key first', async () => {
  routeFetch({
    ...base,
    'GET /api/settings': reply(200, withKey),
    'GET /api/linear/teams': reply(409, { error: 'no_key', message: 'Add a Linear API key first.' }),
    'GET /api/linear/labels': reply(409, { error: 'no_key', message: 'Add a Linear API key first.' }),
  });
  render(<SettingsPage />);
  const linear = await screen.findByRole('region', { name: 'Linear' });
  expect(await within(linear).findByText('Save the Linear key first.')).toBeTruthy();
  expect(within(linear).queryByRole('checkbox')).toBeNull();
});

test('save sends every field and leaves out blank secrets', async () => {
  const f = routeFetch({ ...base, 'POST /api/settings': reply(200, view) });
  const user = userEvent.setup();
  render(<SettingsPage />);
  const jitera = await screen.findByRole('region', { name: 'Jitera' });
  await user.clear(within(jitera).getByLabelText('Compliance to check in specs and TDRs'));
  await user.type(within(jitera).getByLabelText('Compliance to check in specs and TDRs'), 'ISMAP, SOC 2');
  await user.click(within(jitera).getByRole('button', { name: 'Save' }));
  expect(await within(jitera).findByText('Saved')).toBeTruthy();
  expect(bodyOf(f, 'POST', '/api/settings')).toEqual({
    docsUrl: 'https://docs.example.com/mcp',
    jiteraProject: 'proj-1',
    teams: ['CORE'],
    engineers: ['mika@example.com', 'sam@example.com'],
    tdrFolder: 'Technical Design Record (TDR)',
    productDocs: 'TDR and Specs',
    compliance: 'ISMAP, SOC 2',
    publicUrl: 'https://flow.example.com',
  });
  expect(callsTo(f, 'POST', '/api/settings')[0]![1]).toMatchObject({ credentials: 'same-origin', headers: { 'content-type': 'application/json' } });
  expect(screen.getAllByText('Saved')).toHaveLength(1); // only in the section that saved

  await user.type(within(jitera).getByLabelText('Jitera token'), 'new-token');
  await user.click(within(jitera).getByRole('button', { name: 'Save' }));
  await vi.waitFor(() => expect(bodyOf(f, 'POST', '/api/settings', 1).docsToken).toBe('new-token'));
  expect('linearApiKey' in bodyOf(f, 'POST', '/api/settings', 1)).toBe(false);
});

test('Jitera: Test re-reads /api/setup and shows the Jitera message', async () => {
  const ok: SetupView = { ...setup, jitera: { ok: true } };
  const f = routeFetch({ ...base, 'GET /api/setup': [reply(200, ok), reply(200, setup)] });
  const user = userEvent.setup();
  render(<SettingsPage />);
  const jitera = await screen.findByRole('region', { name: 'Jitera' });
  await vi.waitFor(() => expect(callsTo(f, 'GET', '/api/setup')).toHaveLength(1));
  await user.click(within(jitera).getByRole('button', { name: 'Test' }));
  expect(await within(jitera).findByText('Could not read the Jitera documents. Check the URL, project and token.')).toBeTruthy();
  expect(callsTo(f, 'GET', '/api/setup')).toHaveLength(2);
});

test('Jitera: a passing Test says so', async () => {
  routeFetch({ ...base, 'GET /api/setup': reply(200, { ...setup, jitera: { ok: true } }) });
  const user = userEvent.setup();
  render(<SettingsPage />);
  const jitera = await screen.findByRole('region', { name: 'Jitera' });
  await user.click(within(jitera).getByRole('button', { name: 'Test' }));
  expect(await within(jitera).findByText('jflow can read the Jitera documents.')).toBeTruthy();
});

test('People: engineers list, saved lower-cased one per line', async () => {
  const f = routeFetch({ ...base, 'POST /api/settings': reply(200, view) });
  const user = userEvent.setup();
  render(<SettingsPage />);
  const people = await screen.findByRole('region', { name: 'People' });
  await user.type(within(people).getByLabelText(/Engineers/), '\nNew@Example.com');
  await user.click(within(people).getByRole('button', { name: 'Save' }));
  await vi.waitFor(() => expect(bodyOf(f, 'POST', '/api/settings').engineers).toEqual(['mika@example.com', 'sam@example.com', 'new@example.com']));
});

test('People: the jflow address shows the stored value, an edit is saved, a blank one is left out', async () => {
  const f = routeFetch({ ...base, 'POST /api/settings': reply(200, view) });
  const user = userEvent.setup();
  render(<SettingsPage />);
  const people = await screen.findByRole('region', { name: 'People' });
  const address = within(people).getByLabelText('jflow address (public URL)') as HTMLInputElement;
  expect(address.value).toBe('https://flow.example.com');
  await user.clear(address);
  await user.type(address, 'https://jflow.example.org');
  await user.click(within(people).getByRole('button', { name: 'Save' }));
  await vi.waitFor(() => expect(bodyOf(f, 'POST', '/api/settings').publicUrl).toBe('https://jflow.example.org'));

  await user.clear(address);
  await user.click(within(people).getByRole('button', { name: 'Save' }));
  await vi.waitFor(() => expect(callsTo(f, 'POST', '/api/settings')).toHaveLength(2));
  expect('publicUrl' in bodyOf(f, 'POST', '/api/settings', 1)).toBe(false);
});

test('Enter in a field saves and shows the result in that field\'s section', async () => {
  const f = routeFetch({
    ...base,
    'POST /api/settings': [reply(200, view), reply(400, { error: 'invalid', problems: ['publicUrl: bad address'] })],
  });
  const user = userEvent.setup();
  render(<SettingsPage />);
  const jitera = await screen.findByRole('region', { name: 'Jitera' });
  await user.type(within(jitera).getByLabelText('TDR folder'), '{Enter}');
  expect(await within(jitera).findByText('Saved')).toBeTruthy();
  expect(within(screen.getByRole('region', { name: 'Linear' })).queryByText('Saved')).toBeNull();
  expect(callsTo(f, 'POST', '/api/settings')).toHaveLength(1);

  const people = screen.getByRole('region', { name: 'People' });
  await user.type(within(people).getByLabelText('jflow address (public URL)'), '{Enter}');
  expect(await within(people).findByText('publicUrl: bad address')).toBeTruthy();
  expect(within(screen.getByRole('region', { name: 'Linear' })).queryByRole('alert')).toBeNull();
  expect(callsTo(f, 'POST', '/api/settings')).toHaveLength(2);
});

test('shows problems from a 400 in the section that saved', async () => {
  routeFetch({ ...base, 'POST /api/settings': reply(400, { error: 'invalid', problems: ['you cannot remove yourself from engineers', 'docsUrl: bad url'] }) });
  const user = userEvent.setup();
  render(<SettingsPage />);
  const people = await screen.findByRole('region', { name: 'People' });
  await user.click(within(people).getByRole('button', { name: 'Save' }));
  expect(await within(people).findByText('you cannot remove yourself from engineers')).toBeTruthy();
  expect(within(people).getByText('docsUrl: bad url')).toBeTruthy();
  expect(screen.queryByText('Saved')).toBeNull();
  expect(screen.getByLabelText('Jitera MCP URL')).toBeTruthy(); // the form stays to fix it
});

test('shows Not allowed on 403', async () => {
  const message = 'Only jflow engineers can open settings. Ask an engineer to add you.';
  routeFetch({ ...base, 'GET /api/settings': reply(403, { error: 'not_allowed', message }) });
  render(<SettingsPage />);
  expect(await screen.findByText('Not allowed')).toBeTruthy();
  expect(screen.getByText(message)).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
  expect(screen.queryByLabelText('Jitera MCP URL')).toBeNull();
});

test('shows sign-in on 401', async () => {
  routeFetch({ ...base, 'GET /api/settings': reply(401, { error: 'sign_in' }) });
  render(<SettingsPage />);
  expect(await screen.findByText(/Sign in through Cloudflare Access/)).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
});

test('disables Save while the POST is pending', async () => {
  let finish!: (r: Response) => void;
  routeFetch({ ...base, 'POST /api/settings': () => new Promise<Response>((ok) => (finish = ok)) });
  const user = userEvent.setup();
  render(<SettingsPage />);
  const save = within(await screen.findByRole('region', { name: 'People' })).getByRole('button', { name: 'Save' }) as HTMLButtonElement;
  await user.click(save);
  await vi.waitFor(() => expect(save.disabled).toBe(true));
  finish(reply(200, view));
  await vi.waitFor(() => expect(save.disabled).toBe(false));
});
