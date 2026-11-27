import { cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';
import { board, card, me } from '@/test/boardFixture';
import { renderAt } from '@/test/renderAt';
import { callsTo, reply, routeFetch } from '@/test/routeFetch';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

const stuck = card({
  stuck: true,
  waitsFor: [{ kind: 'owner', names: ['Mika'] }, { kind: 'engineer', names: ['sam@example.com'] }],
  openGate: { id: 'g1', from: 'flow:spec-review', to: 'flow:tdr', opened: '2026-11-20T10:00:00.000Z', missing: ['owner', 'engineer'] },
});
const fresh = card({ key: 'zz9', slugId: 'zz9', id: null, name: 'Export to CSV', stage: 'Intent', days: 2, notStarted: true, owner: null, waitsFor: [{ kind: 'owner', names: ['an owner'] }] });
const mineUi = card({ key: 'P-ENG-21', id: 'P-ENG-21', name: 'Folder templates', stage: 'UI', waitingForMe: true, owner: { name: 'Mika Sato', email: 'mika@example.com' } });
const built = card({ key: 'P-ENG-18', id: 'P-ENG-18', name: 'Usage alerts', stage: 'Build', owner: { name: 'Ken Ito', email: 'ken@example.com' }, waitsFor: [{ kind: 'agent', names: ['the agent'] }] });
const done = card({ key: 'P-ENG-7', id: 'P-ENG-7', name: 'Guest limits', stage: 'Done', since: '2026-11-18', waitsFor: [] });

const region = (name: string) => screen.getByRole('region', { name });

test('four phase columns; cards show ID, stage, name, owner and a status chip; stuck and waiting for me stand out', async () => {
  routeFetch({ 'GET /api/me': reply(200, me()), 'GET /api/board': reply(200, board([stuck, fresh, mineUi, built, done])) });
  renderAt('/');
  await screen.findByRole('region', { name: 'Shape' });
  expect(screen.getAllByRole('region').map((r) => r.getAttribute('aria-label'))).toEqual(['Idea', 'Shape', 'Build', 'Ship']);
  expect(within(region('Shape')).getByText('Spec, TDR, UI, Plan')).toBeTruthy();
  expect(screen.getByText('5 features, 1 stuck, 1 waits for you')).toBeTruthy();

  const link = within(region('Shape')).getByRole('link', { name: /Search filters/ });
  expect(link.getAttribute('href')).toBe('/f/P-ENG-12');
  for (const text of ['P-ENG-12', 'Spec review', 'Search filters', 'Mika', 'Mika, sam@example.com', 'Stuck: approval waits 6 days']) {
    expect(within(link).getByText(text)).toBeTruthy();
  }
  expect(link.className).toContain('border-error-border');

  const ui = within(region('Shape')).getByRole('link', { name: /Folder templates/ });
  expect(within(ui).getByText('You: draw and approve UI')).toBeTruthy();
  expect(ui.className).toContain('ring-2');
  expect(within(region('Build')).getByText('Agent')).toBeTruthy();
  expect(within(region('Ship')).getByText('Done Nov 18')).toBeTruthy();

  const intent = within(region('Idea')).getByRole('link');
  expect(intent.getAttribute('href')).toBe('/f/zz9');
  expect(within(intent).getByText('Not started in jflow')).toBeTruthy();
  expect(within(intent).getByText('Needs an owner')).toBeTruthy();
  expect(within(intent).queryByText(/Stuck/)).toBeNull();

  expect(screen.getByText('Waits for a person')).toBeTruthy();
  expect(screen.getByText('Bar: how far the feature is, from Intent to Done')).toBeTruthy();
  expect(screen.queryByText('Agent is working')).toBeNull();
  expect(within(screen.getByRole('navigation', { name: 'Main' })).getByLabelText('1 waiting')).toBeTruthy();
});

test('search, owner and "Only stuck" filter on the page without asking the service again', async () => {
  const f = routeFetch({ 'GET /api/me': reply(200, me()), 'GET /api/board': reply(200, board([stuck, fresh, mineUi, built])) });
  const user = userEvent.setup();
  renderAt('/');
  await screen.findByText('Usage alerts');
  const names = () => screen.getAllByRole('link').filter((l) => l.getAttribute('href')?.startsWith('/f/')).map((l) => l.querySelector('.font-semibold')!.textContent);

  await user.type(screen.getByRole('searchbox', { name: 'Search features' }), 'eng-18');
  expect(names()).toEqual(['Usage alerts']);
  await user.clear(screen.getByRole('searchbox', { name: 'Search features' }));
  await user.type(screen.getByRole('searchbox', { name: 'Search features' }), 'csv');
  expect(names()).toEqual(['Export to CSV']);
  await user.clear(screen.getByRole('searchbox', { name: 'Search features' }));

  const owner = screen.getByRole('combobox', { name: 'Owner' }) as HTMLSelectElement;
  expect([...owner.options].map((o) => o.text)).toEqual(['Owner: Anyone', 'Owner: Ken Ito', 'Owner: Mika Sato']);
  await user.selectOptions(owner, 'ken@example.com');
  expect(names()).toEqual(['Usage alerts']);
  await user.selectOptions(owner, '');

  await user.click(screen.getByRole('button', { name: 'Only stuck' }));
  expect(names()).toEqual(['Search filters']);
  expect(screen.getByRole('button', { name: 'Only stuck' }).getAttribute('aria-pressed')).toBe('true');
  expect(callsTo(f, 'GET', '/api/board')).toHaveLength(1);
});

test('"Waiting for me" asks with mine=1, Refresh with refresh=1, the team picker with team= and remembers the team', async () => {
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

  await user.click(screen.getByRole('button', { name: 'Waiting for me' }));
  await vi.waitFor(() => expect(screen.queryByText('Export to CSV')).toBeNull());
  expect(callsTo(f, 'GET', '/api/board?mine=1')).toHaveLength(1);

  await user.click(screen.getByRole('button', { name: 'Refresh' }));
  await vi.waitFor(() => expect(callsTo(f, 'GET', '/api/board?mine=1&refresh=1')).toHaveLength(1));

  await user.selectOptions(await screen.findByRole('combobox', { name: 'Team' }), 'CORE');
  await vi.waitFor(() => expect(screen.queryByText('Search filters')).toBeNull());
  expect(callsTo(f, 'GET', '/api/board?team=CORE&mine=1')).toHaveLength(1);
  expect(localStorage.getItem('jflow-team')).toBe('CORE');
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

test('the header has Board, Waiting for me and People tabs, the viewer avatar, and Settings in the menu only for engineers; /api/me is asked once', async () => {
  const f = routeFetch({ 'GET /api/me': reply(200, me()), 'GET /api/board': reply(200, board([])) });
  renderAt('/');
  const nav = await screen.findByRole('navigation', { name: 'Main' });
  await screen.findByRole('region', { name: 'Idea' });
  expect(within(nav).getAllByRole('link').map((l) => [l.textContent, l.getAttribute('href')])).toEqual([
    ['Board', '/'], ['Waiting for me', '/waiting'], ['People', '/people'],
  ]);
  expect(within(nav).getByRole('link', { name: 'Board' }).getAttribute('aria-current')).toBe('page');
  expect((await screen.findByRole('img', { name: 'mika@example.com' })).textContent).toBe('M');
  expect(screen.queryByRole('link', { name: 'Settings' })).toBeNull();
  expect(callsTo(f, 'GET', '/api/me')).toHaveLength(1);
  cleanup();

  routeFetch({ 'GET /api/me': reply(200, me({ engineer: true })), 'GET /api/board': reply(200, board([])) });
  renderAt('/');
  expect((await screen.findByRole('link', { name: 'Settings' })).getAttribute('href')).toBe('/settings');
});

test('an empty board says "No features yet."; with "Waiting for me" it says "Nothing waits for you."', async () => {
  routeFetch({ 'GET /api/me': reply(200, me()), 'GET /api/board': reply(200, board([])), 'GET /api/board?mine=1': reply(200, board([])) });
  const user = userEvent.setup();
  renderAt('/');
  expect(await screen.findByText('No features yet.')).toBeTruthy();
  await user.click(screen.getByRole('button', { name: 'Waiting for me' }));
  expect(await screen.findByText('Nothing waits for you.')).toBeTruthy();
  expect(screen.queryByText('No features yet.')).toBeNull();
});

test('"Show older" in Ship asks with older=1, "Hide older" goes back', async () => {
  const old = card({ key: 'P-ENG-2', id: 'P-ENG-2', name: 'Old login', stage: 'Done', days: 40, waitsFor: [] });
  const f = routeFetch({
    'GET /api/me': reply(200, me()),
    'GET /api/board': reply(200, board([stuck])),
    'GET /api/board?older=1': reply(200, board([stuck, old])),
  });
  const user = userEvent.setup();
  renderAt('/');
  const ship = await screen.findByRole('region', { name: 'Ship' });
  await user.click(within(ship).getByRole('button', { name: 'Show older' }));
  expect(await within(ship).findByText('Old login')).toBeTruthy();
  expect(callsTo(f, 'GET', '/api/board?older=1')).toHaveLength(1);
  await user.click(within(ship).getByRole('button', { name: 'Hide older' }));
  await vi.waitFor(() => expect(within(region('Ship')).queryByText('Old login')).toBeNull());
});
