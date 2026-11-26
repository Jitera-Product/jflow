import { cleanup, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';
import type { FeaturePanelView } from '@/api/types';
import { board, card, me } from '@/test/boardFixture';
import { renderAt } from '@/test/renderAt';
import { callsTo, reply, routeFetch } from '@/test/routeFetch';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const gated = card({ openGate: { id: 'g1', to: 'TDR', opened: '2026-11-20', missing: ['owner'] } });

const panel: FeaturePanelView = {
  card: gated,
  stages: [
    { stage: 'Intent', status: 'done', date: '2026-11-18' },
    { stage: 'Spec', status: 'done', date: '2026-11-20' },
    { stage: 'Spec review', status: 'in progress', date: '' },
  ],
  log: [
    { date: '2026-11-18', stage: 'Intent', who: 'mika@example.com', text: 'started' },
    { date: '2026-11-20', stage: 'Spec review', who: 'sam@example.com via jitera', text: '' },
  ],
  gate: { url: 'https://flow.example.com/gate/P-ENG-12/g1', from: 'Spec review', to: 'TDR', missing: ['owner'] },
  files: ['0-status.md', '1-intent.md', '2-spec.md'],
  linearUrl: 'https://linear.app/x/project/a1b2',
  behind: false,
  folder: 'documents/Flow/P-ENG-12 Search filters/',
  notice: null,
};

const AGENT = 'https://studio.jitera.app/p/core/chat?a=agent-1';

const routes = (extra: Record<string, Response> = {}) => ({
  'GET /api/me': reply(200, me()),
  'GET /api/board': reply(200, board([gated])),
  'GET /api/board/feature/P-ENG-12': reply(200, panel),
  ...extra,
});

test('a card click opens the panel at /f/<ID>; Close goes back to the board', async () => {
  const f = routeFetch(routes());
  const user = userEvent.setup();
  const router = renderAt('/');
  await user.click(await screen.findByRole('link', { name: /Search filters/ }));
  const dialog = await screen.findByRole('dialog', { name: 'P-ENG-12 Search filters' });
  expect(router.state.location.pathname).toBe('/f/P-ENG-12');
  expect(callsTo(f, 'GET', '/api/board')).toHaveLength(1);

  await user.click(within(dialog).getByRole('button', { name: 'Close' }));
  await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(router.state.location.pathname).toBe('/');
  expect(callsTo(f, 'GET', '/api/board')).toHaveLength(1);
});

test('the panel takes focus; Escape closes it and gives focus back to the card', async () => {
  routeFetch(routes());
  const user = userEvent.setup();
  const router = renderAt('/');
  const link = await screen.findByRole('link', { name: /Search filters/ });
  await user.click(link);
  const dialog = await screen.findByRole('dialog', { name: 'P-ENG-12 Search filters' });
  expect(document.activeElement).toBe(within(dialog).getByRole('button', { name: 'Close' }));
  await user.keyboard('{Escape}');
  await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(router.state.location.pathname).toBe('/');
  expect(document.activeElement).toBe(screen.getByRole('link', { name: /Search filters/ }));
});

test('Escape closes a panel opened at /f/<ID>', async () => {
  routeFetch(routes());
  const user = userEvent.setup();
  const router = renderAt('/f/P-ENG-12');
  await screen.findByRole('dialog', { name: 'P-ENG-12 Search filters' });
  await user.keyboard('{Escape}');
  await vi.waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  expect(router.state.location.pathname).toBe('/');
});

test('with the panel and New idea open, Escape closes only New idea', async () => {
  routeFetch(routes({ 'GET /api/ideas/owners?team=ENG': reply(200, { owners: [], defaultOwnerId: null }) }));
  const user = userEvent.setup();
  const router = renderAt('/f/P-ENG-12');
  await screen.findByRole('dialog', { name: 'P-ENG-12 Search filters' });
  await user.click(await screen.findByRole('button', { name: 'New idea' }));
  await screen.findByRole('dialog', { name: 'New idea' });
  await user.keyboard('{Escape}');
  await vi.waitFor(() => expect(screen.queryByRole('dialog', { name: 'New idea' })).toBeNull());
  expect(screen.getByRole('dialog', { name: 'P-ENG-12 Search filters' })).toBeTruthy();
  expect(router.state.location.pathname).toBe('/f/P-ENG-12');
});

test('/f/<ID> opens the panel with stages, log, the open gate link, files and the Linear link', async () => {
  routeFetch(routes());
  renderAt('/f/P-ENG-12');
  const dialog = await screen.findByRole('dialog', { name: 'P-ENG-12 Search filters' });
  const d = within(dialog);
  expect(await d.findByText('in progress')).toBeTruthy();
  expect(d.getByText('2026-11-18 - Intent - mika@example.com - started')).toBeTruthy();
  expect(d.getByText('2026-11-20 - Spec review - sam@example.com via jitera')).toBeTruthy();
  expect(d.getByText('Spec review -> TDR, waiting for owner')).toBeTruthy();
  expect(d.getByRole('link', { name: 'Open the gate' }).getAttribute('href')).toBe('https://flow.example.com/gate/P-ENG-12/g1');
  for (const name of panel.files) expect(d.getByText(name)).toBeTruthy();
  expect(d.getByRole('link', { name: 'Open in Linear' }).getAttribute('href')).toBe('https://linear.app/x/project/a1b2');
  expect(d.queryByText(/status file is behind/)).toBeNull();
  expect(screen.queryByText(/Jitera chat/)).toBeNull(); // the Flow agent link is not set
});

test('Open in Jitera chat links to the Flow agent chat bound to the feature folder, in a new tab', async () => {
  routeFetch(routes({ 'GET /api/me': reply(200, me({ flowAgentUrl: AGENT })) }));
  renderAt('/f/P-ENG-12');
  const dialog = await screen.findByRole('dialog', { name: 'P-ENG-12 Search filters' });
  const link = await within(dialog).findByRole('link', { name: 'Open in Jitera chat' });
  expect(link.getAttribute('href')).toBe(`${AGENT}&folder=documents%2FFlow%2FP-ENG-12%20Search%20filters%2F`);
  expect(link.getAttribute('target')).toBe('_blank');
});

test('no Jitera chat link without a folder', async () => {
  routeFetch(routes({
    'GET /api/me': reply(200, me({ flowAgentUrl: AGENT })),
    'GET /api/board/feature/P-ENG-12': reply(200, { ...panel, folder: null }),
  }));
  renderAt('/f/P-ENG-12');
  const dialog = await screen.findByRole('dialog', { name: 'P-ENG-12 Search filters' });
  expect(await within(dialog).findByText('in progress')).toBeTruthy();
  expect(within(dialog).queryByRole('link', { name: 'Open in Jitera chat' })).toBeNull();
});

test('the panel shows the notice when Jitera could not be read', async () => {
  routeFetch(routes({
    'GET /api/board/feature/P-ENG-12': reply(200, { ...panel, stages: [], log: [], gate: null, files: [], folder: null, notice: 'jflow could not read the status file in Jitera.' }),
  }));
  renderAt('/f/P-ENG-12');
  expect(await screen.findByText('jflow could not read the status file in Jitera.')).toBeTruthy();
});

test('the panel says the status file is behind when behind', async () => {
  routeFetch(routes({ 'GET /api/board/feature/P-ENG-12': reply(200, { ...panel, behind: true, card: { ...gated, behind: true } }) }));
  renderAt('/f/P-ENG-12');
  expect(await screen.findByText('The status file is behind: Linear says Spec review.')).toBeTruthy();
});

test('a slugId link opens a not started feature; an unknown one says not found', async () => {
  const fresh = card({ key: 'zz9', slugId: 'zz9', id: null, name: 'Export to CSV', stage: 'Intent', notStarted: true });
  routeFetch(routes({
    'GET /api/board/feature/zz9': reply(200, { ...panel, card: fresh, stages: [], log: [], gate: null, files: [] }),
    'GET /api/board/feature/nope': reply(404, { error: 'not_found', message: 'No flow project "nope" in the jflow teams.' }),
  }));
  renderAt('/f/zz9');
  const dialog = await screen.findByRole('dialog', { name: 'Export to CSV' });
  expect(await within(dialog).findByText('Not started in jflow')).toBeTruthy();
  cleanup();

  renderAt('/f/nope');
  expect(await screen.findByText('No flow project "nope" in the jflow teams.')).toBeTruthy();
});
