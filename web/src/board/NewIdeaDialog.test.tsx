import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';
import { board, card, me } from '@/test/boardFixture';
import { renderAt } from '@/test/renderAt';
import { bodyOf, callsTo, reply, routeFetch } from '@/test/routeFetch';
import { NewIdeaDialog } from './NewIdeaDialog';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const owners = (defaultOwnerId: string | null) => ({
  owners: [{ id: 'u1', name: 'Mika', email: 'mika@example.com' }, { id: 'u2', name: 'Sam', email: 'sam@example.com' }],
  defaultOwnerId,
});
const CHAT = 'https://studio.jitera.app/p/core/chat?a=agent-1';
const created = { uuid: 'uuid-1', slugId: 'new1', url: 'https://linear.app/x/project/new1', chatUrl: CHAT };

test('from the header: picked teams, owner preselected, requester is me, created in Linear, the chat opens, then the card shows in Idea as not started', async () => {
  const open = vi.fn();
  vi.stubGlobal('open', open);
  const added = card({ key: 'new1', slugId: 'new1', id: null, name: 'Bulk invite', stage: 'Intent', notStarted: true, days: 0 });
  const f = routeFetch({
    'GET /api/me': reply(200, me()),
    'GET /api/board': reply(200, board([])),
    'GET /api/board?refresh=1': reply(200, board([added])),
    'GET /api/ideas/owners?team=ENG': reply(200, owners('u1')),
    'POST /api/ideas': reply(200, created),
  });
  const user = userEvent.setup();
  renderAt('/');
  await screen.findByRole('region', { name: 'Idea' });
  await user.click(await screen.findByRole('button', { name: 'New idea' }));
  const dialog = await screen.findByRole('dialog', { name: 'New idea' });
  const d = within(dialog);

  const team = d.getByRole('combobox', { name: 'Team' }) as HTMLSelectElement;
  expect([...team.options].map((o) => o.value)).toEqual(['ENG', 'CORE']);
  await vi.waitFor(() => expect((d.getByRole('combobox', { name: 'Owner' }) as HTMLSelectElement).value).toBe('u1'));
  expect((d.getByLabelText('Requester') as HTMLInputElement).value).toBe('mika@example.com (me)');
  expect(d.getByText('This creates a Linear project and opens a chat with the Flow agent. The team sees the idea on the board.')).toBeTruthy();

  await user.type(d.getByLabelText('Title'), 'Bulk invite');
  await user.type(d.getByLabelText('What problem does it solve?'), 'Admins add people one by one.');
  await user.type(d.getByLabelText('Who is it for?'), 'Workspace admins');
  await user.click(d.getByRole('button', { name: 'Create and start chat' }));

  expect(await d.findByText('Created in Linear')).toBeTruthy();
  expect(open).toHaveBeenCalledWith(CHAT, '_blank', 'noopener,noreferrer');
  expect(d.getByRole('link', { name: 'Open the chat' }).getAttribute('href')).toBe(CHAT);
  expect(d.getByRole('link', { name: 'Open in Linear' }).getAttribute('href')).toBe(created.url);
  expect(d.getByText('Start it in the Jitera chat with the Flow agent, using the project ID from Linear.')).toBeTruthy();
  expect(bodyOf(f, 'POST', '/api/ideas')).toEqual({
    title: 'Bulk invite', problem: 'Admins add people one by one.', audience: 'Workspace admins', team: 'ENG', ownerId: 'u1',
  });

  const intent = await screen.findByRole('region', { name: 'Idea' });
  expect(await within(intent).findByText('Bulk invite')).toBeTruthy();
  expect(within(intent).getByText('Not started in jflow')).toBeTruthy();
  expect(callsTo(f, 'GET', '/api/board?refresh=1')).toHaveLength(1);

  expect(document.activeElement).toBe(d.getByRole('button', { name: 'Close' }));
  await user.click(d.getByRole('button', { name: 'Close' }));
  expect(screen.queryByRole('dialog')).toBeNull();
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'New idea' }));
  expect(screen.getByRole('banner').contains(dialog)).toBe(false);
});

test('Escape closes the dialog before and after success; without a chat link nothing opens', async () => {
  const open = vi.fn();
  vi.stubGlobal('open', open);
  routeFetch({ 'GET /api/ideas/owners?team=ENG': reply(200, owners('u1')), 'POST /api/ideas': reply(200, { ...created, chatUrl: null }) });
  const onClose = vi.fn();
  const user = userEvent.setup();
  render(<NewIdeaDialog teams={['ENG']} requester="mika@example.com" onClose={onClose} />);
  await screen.findByRole('dialog', { name: 'New idea' });
  await user.keyboard('{Escape}');
  expect(onClose).toHaveBeenCalledOnce();
  cleanup();

  render(<NewIdeaDialog teams={['ENG']} requester="mika@example.com" onClose={onClose} />);
  await vi.waitFor(() => expect((screen.getByRole('combobox', { name: 'Owner' }) as HTMLSelectElement).value).toBe('u1'));
  await user.type(screen.getByLabelText('Title'), 'Bulk invite');
  await user.click(screen.getByRole('button', { name: 'Create and start chat' }));
  await screen.findByText('Created in Linear');
  expect(open).not.toHaveBeenCalled();
  expect(screen.queryByRole('link', { name: 'Open the chat' })).toBeNull();
  expect(screen.getByRole('link', { name: 'See it on the board' }).getAttribute('href')).toBe('/');
  await user.keyboard('{Escape}');
  expect(onClose).toHaveBeenCalledTimes(2);
});

test('without a default owner it is "Pick later" and sends no owner; a team change loads its members', async () => {
  const f = routeFetch({
    'GET /api/ideas/owners?team=ENG': reply(200, owners(null)),
    'GET /api/ideas/owners?team=CORE': reply(200, { owners: [{ id: 'u9', name: 'Bo', email: 'bo@example.com' }], defaultOwnerId: null }),
    'POST /api/ideas': reply(200, created),
  });
  const onCreated = vi.fn();
  const user = userEvent.setup();
  vi.stubGlobal('open', vi.fn());
  render(<NewIdeaDialog teams={['ENG', 'CORE']} requester="mika@example.com" onClose={() => {}} onCreated={onCreated} />);
  const owner = (await screen.findByRole('combobox', { name: 'Owner' })) as HTMLSelectElement;
  await screen.findByRole('option', { name: 'Sam' });
  expect(owner.value).toBe('');
  expect(owner.options[0]!.text).toBe('Pick later');

  await user.selectOptions(screen.getByRole('combobox', { name: 'Team' }), 'CORE');
  await screen.findByRole('option', { name: 'Bo' });
  await user.type(screen.getByLabelText('Title'), 'Bulk invite');
  await user.click(screen.getByRole('button', { name: 'Create and start chat' }));
  expect(await screen.findByText('Created in Linear')).toBeTruthy();
  expect(bodyOf(f, 'POST', '/api/ideas')).toMatchObject({ team: 'CORE', ownerId: '' });
  expect(onCreated).toHaveBeenCalledOnce();
});

test('a refused idea shows the message and the problems', async () => {
  routeFetch({
    'GET /api/ideas/owners?team=ENG': reply(200, owners('u1')),
    'POST /api/ideas': reply(400, { error: 'invalid', message: 'Give the idea a title and pick a team.', problems: ['title: Too big'] }),
  });
  const user = userEvent.setup();
  render(<NewIdeaDialog teams={['ENG']} requester="mika@example.com" onClose={() => {}} />);
  await vi.waitFor(() => expect((screen.getByRole('combobox', { name: 'Owner' }) as HTMLSelectElement).value).toBe('u1'));
  await user.type(screen.getByLabelText('Title'), 'x');
  await user.click(screen.getByRole('button', { name: 'Create and start chat' }));
  expect(await screen.findByText('Give the idea a title and pick a team.')).toBeTruthy();
  expect(screen.getByText('title: Too big')).toBeTruthy();
  expect(screen.queryByText('Created in Linear')).toBeNull();
});
