import { cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';
import { board, card, me, STAGES } from '@/test/boardFixture';
import { renderAt } from '@/test/renderAt';
import { callsTo, reply, routeFetch } from '@/test/routeFetch';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const stuck = card({
  stuck: true,
  waitsFor: [{ kind: 'owner', names: ['Mika'] }, { kind: 'engineer', names: ['sam@example.com'] }],
  openGate: { id: 'g1', to: 'TDR', opened: '2026-11-20', missing: ['owner', 'engineer'] },
});
const fresh = card({ key: 'zz9', slugId: 'zz9', id: null, name: 'Export to CSV', stage: 'Intent', days: 2, notStarted: true, owner: null, waitsFor: [{ kind: 'owner', names: ['an owner'] }] });

test('columns come in stage order, empty ones narrow, and a card shows ID, name, owner, days, who it waits for and a stuck mark', async () => {
  routeFetch({ 'GET /api/me': reply(200, me()), 'GET /api/board': reply(200, board([stuck, fresh])) });
  renderAt('/');
  const review = await screen.findByRole('region', { name: 'Spec review' });
  expect(screen.getAllByRole('region').map((r) => r.getAttribute('aria-label'))).toEqual(STAGES);
  expect(screen.getByRole('region', { name: 'TDR' }).className).toContain('w-28');
  expect(review.className).not.toContain('w-28');

  const link = within(review).getByRole('link');
  expect(link.getAttribute('href')).toBe('/f/P-ENG-12');
  for (const text of ['P-ENG-12', 'Search filters', 'Mika', '4 days in stage', 'Waits for Mika and sam@example.com', 'Stuck']) {
    expect(within(link).getByText(text)).toBeTruthy();
  }
  expect(screen.getByText('1 stuck')).toBeTruthy();

  const intent = within(screen.getByRole('region', { name: 'Intent' })).getByRole('link');
  expect(intent.getAttribute('href')).toBe('/f/zz9');
  expect(within(intent).getByText('Not started in jflow')).toBeTruthy();
  expect(within(intent).queryByText('zz9')).toBeNull();
  expect(within(intent).queryByText('Stuck')).toBeNull();
});

test('"Only waiting for me" asks with mine=1, Refresh with refresh=1, the team filter with team=', async () => {
  const f = routeFetch({
    'GET /api/me': reply(200, me()),
    'GET /api/board': reply(200, board([stuck, fresh])),
    'GET /api/board?mine=1': reply(200, board([stuck])),
    'GET /api/board?mine=1&refresh=1': reply(200, board([stuck])),
    'GET /api/board?team=CORE&mine=1': reply(200, board([])),
  });
  const user = userEvent.setup();
  renderAt('/');
  await screen.findByText('Export to CSV');

  await user.click(screen.getByRole('checkbox', { name: 'Only waiting for me' }));
  await vi.waitFor(() => expect(screen.queryByText('Export to CSV')).toBeNull());
  expect(callsTo(f, 'GET', '/api/board?mine=1')).toHaveLength(1);

  await user.click(screen.getByRole('button', { name: 'Refresh' }));
  await vi.waitFor(() => expect(callsTo(f, 'GET', '/api/board?mine=1&refresh=1')).toHaveLength(1));

  await user.selectOptions(screen.getByRole('combobox', { name: 'Team' }), 'CORE');
  await vi.waitFor(() => expect(screen.queryByText('Search filters')).toBeNull());
  expect(callsTo(f, 'GET', '/api/board?team=CORE&mine=1')).toHaveLength(1);
});

test('the notice shows when set', async () => {
  const notice = 'jflow could not read the status files in Jitera. Stages come from Linear only.';
  routeFetch({ 'GET /api/me': reply(200, me()), 'GET /api/board': reply(200, board([fresh], { notice })) });
  renderAt('/');
  expect(await screen.findByText(notice)).toBeTruthy();
});

test('409 not_configured shows the setup message', async () => {
  routeFetch({
    'GET /api/me': reply(200, me()),
    'GET /api/board': reply(409, { error: 'not_configured', message: 'An engineer has to finish setup on /settings first.' }),
  });
  renderAt('/');
  expect(await screen.findByText('An engineer has to finish setup on /settings first.')).toBeTruthy();
});

test('the header links Stages and Workload, and Settings only for engineers; /api/me is asked once', async () => {
  const f = routeFetch({ 'GET /api/me': reply(200, me()), 'GET /api/board': reply(200, board([])) });
  renderAt('/');
  const nav = await screen.findByRole('navigation');
  await screen.findByRole('region', { name: 'Intent' });
  expect(within(nav).getByRole('link', { name: 'Stages' }).getAttribute('href')).toBe('/');
  expect(within(nav).getByRole('link', { name: 'Workload' }).getAttribute('href')).toBe('/workload');
  expect(within(nav).queryByRole('link', { name: 'Settings' })).toBeNull();
  expect(callsTo(f, 'GET', '/api/me')).toHaveLength(1);
  cleanup();

  routeFetch({ 'GET /api/me': reply(200, me({ engineer: true })), 'GET /api/board': reply(200, board([])) });
  renderAt('/');
  const nav2 = await screen.findByRole('navigation');
  expect((await within(nav2).findByRole('link', { name: 'Settings' })).getAttribute('href')).toBe('/settings');
});

test('an empty board says "No features yet."; with "Only waiting for me" it says "Nothing waits for you."', async () => {
  routeFetch({ 'GET /api/me': reply(200, me()), 'GET /api/board': reply(200, board([])), 'GET /api/board?mine=1': reply(200, board([])) });
  const user = userEvent.setup();
  renderAt('/');
  expect(await screen.findByText('No features yet.')).toBeTruthy();
  await user.click(screen.getByRole('checkbox', { name: 'Only waiting for me' }));
  expect(await screen.findByText('Nothing waits for you.')).toBeTruthy();
  expect(screen.queryByText('No features yet.')).toBeNull();
});

test('"Show older" in Done asks with older=1, "Hide older" goes back', async () => {
  const old = card({ key: 'P-ENG-2', id: 'P-ENG-2', name: 'Old login', stage: 'Done', days: 40, waitsFor: [] });
  const f = routeFetch({
    'GET /api/me': reply(200, me()),
    'GET /api/board': reply(200, board([stuck])),
    'GET /api/board?older=1': reply(200, board([stuck, old])),
  });
  const user = userEvent.setup();
  renderAt('/');
  const done = await screen.findByRole('region', { name: 'Done' });
  await user.click(within(done).getByRole('button', { name: 'Show older' }));
  expect(await within(done).findByText('Old login')).toBeTruthy();
  expect(callsTo(f, 'GET', '/api/board?older=1')).toHaveLength(1);
  await user.click(within(done).getByRole('button', { name: 'Hide older' }));
  await vi.waitFor(() => expect(within(screen.getByRole('region', { name: 'Done' })).queryByText('Old login')).toBeNull());
});
