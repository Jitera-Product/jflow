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
const created = { uuid: 'uuid-1', slugId: 'new1', url: 'https://linear.app/x/project/new1' };

test('from the header: picked teams, owner preselected, created in Linear, then the card shows in Intent as not started', async () => {
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
  await screen.findByRole('region', { name: 'Intent' });
  await user.click(await screen.findByRole('button', { name: 'New idea' }));
  const dialog = await screen.findByRole('dialog', { name: 'New idea' });
  const d = within(dialog);

  const team = d.getByRole('combobox', { name: 'Team' }) as HTMLSelectElement;
  expect([...team.options].map((o) => o.value)).toEqual(['ENG', 'CORE']);
  await vi.waitFor(() => expect((d.getByRole('combobox', { name: 'Owner' }) as HTMLSelectElement).value).toBe('u1'));

  await user.type(d.getByLabelText('Title'), 'Bulk invite');
  await user.type(d.getByLabelText('The problem'), 'Admins add people one by one.');
  await user.type(d.getByLabelText('Who it is for'), 'Workspace admins');
  await user.click(d.getByRole('button', { name: 'Create' }));

  expect(await d.findByText('Created in Linear')).toBeTruthy();
  expect(d.getByRole('link', { name: 'Open in Linear' }).getAttribute('href')).toBe(created.url);
  expect(d.getByText('Start it in the Jitera chat with the Flow agent, using the project ID from Linear.')).toBeTruthy();
  expect(bodyOf(f, 'POST', '/api/ideas')).toEqual({
    title: 'Bulk invite', problem: 'Admins add people one by one.', audience: 'Workspace admins', team: 'ENG', ownerId: 'u1',
  });

  const intent = await screen.findByRole('region', { name: 'Intent' });
  expect(await within(intent).findByText('Bulk invite')).toBeTruthy();
  expect(within(intent).getByText('Not started in jflow')).toBeTruthy();
  expect(callsTo(f, 'GET', '/api/board?refresh=1')).toHaveLength(1);

  await user.click(d.getByRole('button', { name: 'Close' }));
  expect(screen.queryByRole('dialog')).toBeNull();
});

test('without a default owner the owner is required; a team change loads its members', async () => {
  const f = routeFetch({
    'GET /api/ideas/owners?team=ENG': reply(200, owners(null)),
    'GET /api/ideas/owners?team=CORE': reply(200, { owners: [{ id: 'u9', name: 'Bo', email: 'bo@example.com' }], defaultOwnerId: null }),
    'POST /api/ideas': reply(200, created),
  });
  const onCreated = vi.fn();
  const user = userEvent.setup();
  render(<NewIdeaDialog teams={['ENG', 'CORE']} onClose={() => {}} onCreated={onCreated} />);
  const owner = (await screen.findByRole('combobox', { name: 'Owner' })) as HTMLSelectElement;
  await screen.findByRole('option', { name: 'Sam' });
  expect(owner.value).toBe('');

  await user.type(screen.getByLabelText('Title'), 'Bulk invite');
  await user.click(screen.getByRole('button', { name: 'Create' }));
  expect(await screen.findByText('Pick an owner.')).toBeTruthy();
  expect(callsTo(f, 'POST', '/api/ideas')).toHaveLength(0);

  await user.selectOptions(screen.getByRole('combobox', { name: 'Team' }), 'CORE');
  await screen.findByRole('option', { name: 'Bo' });
  await user.selectOptions(owner, 'u9');
  await user.click(screen.getByRole('button', { name: 'Create' }));
  expect(await screen.findByText('Created in Linear')).toBeTruthy();
  expect(bodyOf(f, 'POST', '/api/ideas')).toMatchObject({ team: 'CORE', ownerId: 'u9' });
  expect(onCreated).toHaveBeenCalledOnce();
});

test('a refused idea shows the message and the problems', async () => {
  routeFetch({
    'GET /api/ideas/owners?team=ENG': reply(200, owners('u1')),
    'POST /api/ideas': reply(400, { error: 'invalid', message: 'Give the idea a title and pick a team.', problems: ['title: Too big'] }),
  });
  const user = userEvent.setup();
  render(<NewIdeaDialog teams={['ENG']} onClose={() => {}} />);
  await vi.waitFor(() => expect((screen.getByRole('combobox', { name: 'Owner' }) as HTMLSelectElement).value).toBe('u1'));
  await user.type(screen.getByLabelText('Title'), 'x');
  await user.click(screen.getByRole('button', { name: 'Create' }));
  expect(await screen.findByText('Give the idea a title and pick a team.')).toBeTruthy();
  expect(screen.getByText('title: Too big')).toBeTruthy();
  expect(screen.queryByText('Created in Linear')).toBeNull();
});
