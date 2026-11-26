import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';
import type { ChatToken } from '@/api/types';
import { bodyOf, callsTo, reply, routeFetch } from '@/test/routeFetch';
import { ChatsSection } from './ChatsSection';

const publicUrl = 'https://flow.example.com';
const token = 'jflow_tok_9f8e7d6c5b4a';
const prompt = '# Flow agent\n\nYou run the jflow flow.';

const used: ChatToken = { id: 'c1', name: 'Jitera', createdBy: 'mika@example.com', createdAt: '2026-11-20T10:00:00.000Z', lastUsedAt: '2026-11-21T09:30:00.000Z' };
const fresh: ChatToken = { id: 'c2', name: 'Claude Code', createdBy: 'mika@example.com', createdAt: '2026-11-26T08:00:00.000Z', lastUsedAt: null };

const when = (iso: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));

const settings = (url: string) => reply(200, { email: 'mika@example.com', settings: { publicUrl: url } });

const agentPrompt = () => new Response(prompt, { status: 200, headers: { 'content-type': 'text/markdown; charset=utf-8' } });

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

test('the list shows name, created by, created at, last used and Revoke', async () => {
  const f = routeFetch({
    'GET /api/chats': [reply(200, { chats: [used, fresh] }), reply(200, { chats: [fresh] })],
    'DELETE /api/chats/c1': reply(204),
  });
  const user = userEvent.setup();
  render(<ChatsSection publicUrl={publicUrl} />);
  const row = (await screen.findByText('Jitera')).closest('li')!;
  expect(row.textContent).toContain('mika@example.com');
  expect(row.textContent).toContain(when(used.createdAt));
  expect(row.textContent).toContain(`Last used ${when(used.lastUsedAt!)}`);
  expect(screen.getByText('Claude Code').closest('li')!.textContent).toContain('Last used never');

  await user.click(within(row).getByRole('button', { name: 'Revoke' }));
  expect(callsTo(f, 'DELETE', '/api/chats/c1')).toHaveLength(0);
  expect(within(row).getByText('Revoke Jitera? The chat that uses it stops working.')).toBeTruthy();
  await user.click(within(row).getByRole('button', { name: 'Cancel' }));
  expect(callsTo(f, 'DELETE', '/api/chats/c1')).toHaveLength(0);
  await user.click(within(row).getByRole('button', { name: 'Revoke' }));
  await user.click(within(row).getByRole('button', { name: 'Revoke' }));
  await vi.waitFor(() => expect(screen.queryByText('Jitera')).toBeNull());
  expect(callsTo(f, 'DELETE', '/api/chats/c1')[0]![1]).toMatchObject({ credentials: 'same-origin', headers: { 'content-type': 'application/json' } });
});

test('New token asks a name, shows the token once with the three blocks, and forgets it on Done', async () => {
  const f = routeFetch({
    'GET /api/chats': [reply(200, { chats: [] }), reply(200, { chats: [fresh] })],
    'POST /api/chats': reply(200, { chat: fresh, token }),
    'GET /api/settings': settings(publicUrl),
    'GET /api/agent-prompt': agentPrompt,
  });
  const user = userEvent.setup();
  render(<ChatsSection publicUrl={publicUrl} />);
  await user.click(await screen.findByRole('button', { name: 'New token' }));
  await user.type(screen.getByLabelText('Chat name'), 'Claude Code');
  await user.click(screen.getByRole('button', { name: 'Create' }));
  expect(bodyOf(f, 'POST', '/api/chats')).toEqual({ name: 'Claude Code' });

  const jitera = await screen.findByRole('group', { name: 'Jitera' });
  expect(await within(jitera).findByText((_, el) => el?.tagName === 'PRE' && el.textContent === prompt)).toBeTruthy();
  expect(within(jitera).getByText(`${publicUrl}/mcp`)).toBeTruthy();
  expect(within(jitera).getByText('Auth type: Bearer token')).toBeTruthy();
  expect(within(jitera).getByText(token)).toBeTruthy();

  const claude = screen.getByRole('group', { name: 'Claude Code' });
  expect(claude.textContent).toContain('/plugin marketplace add Jitera-Product/jflow');
  expect(claude.textContent).toContain('/plugin install flow@jflow');
  expect(claude.textContent).toContain(`claude mcp add --transport http jflow ${publicUrl}/mcp --header "Authorization: Bearer ${token}"`);

  const other = screen.getByRole('group', { name: 'Other MCP chat' });
  expect(within(other).getByText(`${publicUrl}/mcp`)).toBeTruthy();
  expect(within(other).getByText(`Authorization: Bearer ${token}`)).toBeTruthy();

  await user.click(screen.getByRole('button', { name: 'Done' }));
  expect(document.body.innerHTML).not.toContain(token);
  expect(await screen.findByText('Last used never', { exact: false })).toBeTruthy();
  expect(localStorage.length).toBe(0);
  expect(sessionStorage.length).toBe(0);
  expect(callsTo(f, 'POST', '/api/chats')).toHaveLength(1);
});

test('no_public_url asks to save the settings first; name_taken shows the message', async () => {
  routeFetch({
    'GET /api/chats': reply(200, { chats: [] }),
    'POST /api/chats': [
      reply(409, { error: 'no_public_url', message: 'Set the public URL first.' }),
      reply(409, { error: 'name_taken', message: 'A chat with this name exists.' }),
    ],
  });
  const user = userEvent.setup();
  render(<ChatsSection publicUrl="" />);
  await user.click(await screen.findByRole('button', { name: 'New token' }));
  await user.type(screen.getByLabelText('Chat name'), 'Jitera');
  await user.click(screen.getByRole('button', { name: 'Create' }));
  expect(await screen.findByText('Save the settings once first, so jflow knows its address.')).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Create' }));
  expect(await screen.findByText('A chat with this name exists.')).toBeTruthy();
});

test('Copy writes to the clipboard; when that fails, the text is selected to copy by hand', async () => {
  routeFetch({
    'GET /api/chats': reply(200, { chats: [] }),
    'POST /api/chats': reply(200, { chat: fresh, token }),
    'GET /api/settings': settings(publicUrl),
    'GET /api/agent-prompt': agentPrompt,
  });
  const user = userEvent.setup();
  const writeText = vi.fn().mockResolvedValueOnce(undefined).mockRejectedValueOnce(new Error('denied'));
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
  render(<ChatsSection publicUrl={publicUrl} />);
  await user.click(await screen.findByRole('button', { name: 'New token' }));
  await user.type(screen.getByLabelText('Chat name'), 'Claude Code');
  await user.click(screen.getByRole('button', { name: 'Create' }));
  const other = await screen.findByRole('group', { name: 'Other MCP chat' });

  await user.click(within(other).getByRole('button', { name: 'Copy Header' }));
  expect(writeText).toHaveBeenLastCalledWith(`Authorization: Bearer ${token}`);
  expect(await within(other).findByText('Copied')).toBeTruthy();

  await user.click(within(other).getByRole('button', { name: 'Copy URL' }));
  expect(writeText).toHaveBeenLastCalledWith(`${publicUrl}/mcp`);
  await vi.waitFor(() => expect(String(window.getSelection())).toBe(`${publicUrl}/mcp`));
});

test('the blocks use the address read after create, and wait while it is still blank', async () => {
  routeFetch({
    'GET /api/chats': reply(200, { chats: [] }),
    'POST /api/chats': reply(200, { chat: fresh, token }),
    'GET /api/settings': [settings(publicUrl), settings('')],
    'GET /api/agent-prompt': agentPrompt,
  });
  const user = userEvent.setup();
  render(<ChatsSection publicUrl="" />); // the page loaded before another engineer set the address
  const make = async () => {
    await user.click(await screen.findByRole('button', { name: 'New token' }));
    await user.type(screen.getByLabelText('Chat name'), 'Claude Code');
    await user.click(screen.getByRole('button', { name: 'Create' }));
  };
  await make();
  const other = await screen.findByRole('group', { name: 'Other MCP chat' });
  expect(within(other).getByText(`${publicUrl}/mcp`)).toBeTruthy();
  expect(document.body.innerHTML).not.toMatch(/>\/mcp</);
  await user.click(screen.getByRole('button', { name: 'Done' }));

  await make();
  expect(await screen.findByText('Save the settings once first, so jflow knows its address.')).toBeTruthy();
  expect(screen.queryByRole('group')).toBeNull();
  expect(screen.getByText(token)).toBeTruthy(); // shown once, so it must not be lost
});
