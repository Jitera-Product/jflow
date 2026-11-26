import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';
import type { SettingsView } from '@/api/types';
import { SettingsPage } from './SettingsPage';

const view: SettingsView = {
  email: 'mika@example.com',
  settings: {
    docsUrl: 'https://docs.example.com/mcp',
    jiteraProject: 'proj-1',
    docsTokenSet: true,
    linearApiKeySet: false,
    teams: ['CORE', 'ENG'],
    engineers: ['mika@example.com', 'sam@example.com'],
    updatedBy: 'sam@example.com',
    updatedAt: '2026-11-20T10:00:00.000Z',
  },
};

const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

// Answers the GET with `view`, then each POST with the next of `posts`.
function stubFetch(first: Response, ...posts: Response[]) {
  const f = vi.fn(async (_url: string, init?: RequestInit) => (init?.method === 'POST' ? posts.shift()! : first));
  vi.stubGlobal('fetch', f);
  return f;
}

const postBody = (f: ReturnType<typeof stubFetch>, n = 0) => {
  const posts = f.mock.calls.filter(([, init]) => init?.method === 'POST');
  return JSON.parse(String(posts[n]![1]!.body));
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test('SettingsPage shows loaded values and only "Set" for secrets', async () => {
  const f = stubFetch(reply(200, { ...view, settings: { ...view.settings, docsToken: 'tok-secret-1' } })); // as if the service leaked it
  render(<SettingsPage />);
  expect(((await screen.findByLabelText('Jitera MCP URL')) as HTMLInputElement).value).toBe('https://docs.example.com/mcp');
  expect((screen.getByLabelText('x-jitera-project') as HTMLInputElement).value).toBe('proj-1');
  expect((screen.getByLabelText(/Linear teams/) as HTMLInputElement).value).toBe('CORE ENG');
  expect((screen.getByLabelText(/Engineers/) as HTMLTextAreaElement).value).toBe('mika@example.com\nsam@example.com');
  const token = screen.getByLabelText('Docs token') as HTMLInputElement;
  expect(token.type).toBe('password');
  expect(token.value).toBe('');
  expect(token.placeholder).toBe('Set, leave blank to keep');
  expect((screen.getByLabelText('Linear API key') as HTMLInputElement).placeholder).toBe('Not set');
  expect(screen.getByText(/Last saved by sam@example.com,/)!.textContent).toBe(`Last saved by sam@example.com, ${new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date('2026-11-20T10:00:00.000Z'))}`);
  expect(f).toHaveBeenCalledWith('/api/settings', expect.objectContaining({ credentials: 'same-origin' }));
  expect(document.body.innerHTML).not.toContain('tok-secret-1');
});

test('SettingsPage save sends upper-cased teams and leaves out blank secrets', async () => {
  const saved = { ...view, settings: { ...view.settings, teams: ['CORE', 'OPS'], updatedBy: 'mika@example.com' } };
  const f = stubFetch(reply(200, view), reply(200, saved), reply(200, saved));
  const user = userEvent.setup();
  render(<SettingsPage />);
  const teams = await screen.findByLabelText(/Linear teams/);
  await user.clear(teams);
  await user.type(teams, 'core  ops');
  await user.click(screen.getByRole('button', { name: 'Save' }));
  expect(await screen.findByText('Saved')).toBeTruthy();
  const body = postBody(f);
  expect(body).toEqual({
    docsUrl: 'https://docs.example.com/mcp',
    jiteraProject: 'proj-1',
    teams: ['CORE', 'OPS'],
    engineers: ['mika@example.com', 'sam@example.com'],
  });
  expect('docsToken' in body).toBe(false);
  expect('linearApiKey' in body).toBe(false);
  expect(f.mock.calls[1]![1]).toMatchObject({ credentials: 'same-origin', headers: { 'content-type': 'application/json' } });

  await user.type(screen.getByLabelText('Docs token'), 'new-token');
  await user.click(screen.getByRole('button', { name: 'Save' }));
  await vi.waitFor(() => expect(postBody(f, 1).docsToken).toBe('new-token'));
  expect('linearApiKey' in postBody(f, 1)).toBe(false);
});

test('SettingsPage shows problems from a 400', async () => {
  stubFetch(reply(200, view), reply(400, { error: 'invalid', problems: ['you cannot remove yourself from engineers', 'docsUrl: bad url'] }));
  const user = userEvent.setup();
  render(<SettingsPage />);
  await user.click(await screen.findByRole('button', { name: 'Save' }));
  expect(await screen.findByText('you cannot remove yourself from engineers')).toBeTruthy();
  expect(screen.getByText('docsUrl: bad url')).toBeTruthy();
  expect(screen.queryByText('Saved')).toBeNull();
  expect(screen.getByLabelText('Jitera MCP URL')).toBeTruthy(); // the form stays to fix it
});

test('SettingsPage shows Not allowed on 403', async () => {
  const message = 'Only jflow engineers can open settings. Ask an engineer to add you.';
  stubFetch(reply(403, { error: 'not_allowed', message }));
  render(<SettingsPage />);
  expect(await screen.findByText('Not allowed')).toBeTruthy();
  expect(screen.getByText(message)).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
  expect(screen.queryByLabelText('Jitera MCP URL')).toBeNull();
});

test('SettingsPage shows sign-in on 401', async () => {
  stubFetch(reply(401, { error: 'sign_in' }));
  render(<SettingsPage />);
  expect(await screen.findByText(/Sign in through Cloudflare Access/)).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
});

test('SettingsPage disables Save while the POST is pending', async () => {
  let finish!: (r: Response) => void;
  const f = vi.fn((_url: string, init?: RequestInit) => (init?.method === 'POST' ? new Promise<Response>((ok) => (finish = ok)) : Promise.resolve(reply(200, view))));
  vi.stubGlobal('fetch', f);
  const user = userEvent.setup();
  render(<SettingsPage />);
  const save = (await screen.findByRole('button', { name: 'Save' })) as HTMLButtonElement;
  await user.click(save);
  await vi.waitFor(() => expect(save.disabled).toBe(true));
  finish(reply(200, view));
  await vi.waitFor(() => expect(save.disabled).toBe(false));
});
