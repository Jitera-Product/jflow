import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { board, card, me } from '@/test/boardFixture';
import { renderAt } from '@/test/renderAt';
import { callsTo, reply, routeFetch } from '@/test/routeFetch';
import { AppHeader } from '@/shell/AppHeader';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  localStorage.clear();
});

const gated = card({
  key: 'P-ENG-19', id: 'P-ENG-19', name: 'Read-only share links', waitingForMe: true, owner: { name: 'Mika Sato', email: 'mika.sato@example.com' },
  openGate: { id: 'g7', from: 'flow:spec-review', to: 'flow:tdr', opened: '2026-11-24T10:00:00.000Z', missing: ['owner'] },
});
const ui = card({ key: 'P-ENG-21', id: 'P-ENG-21', name: 'Folder templates', stage: 'UI', days: 1, waitingForMe: true });

test('/waiting lists what waits for me: gates to approve with the confirm link, the rest to decide in the panel', async () => {
  const f = routeFetch({ 'GET /api/me': reply(200, me({ email: 'mika.sato@example.com' })), 'GET /api/board?mine=1': reply(200, board([ui, gated])) });
  renderAt('/waiting');
  expect(await screen.findByRole('heading', { name: 'Waiting for you, Mika' })).toBeTruthy();
  expect(screen.getByText('2 things. The oldest has waited 2 days.')).toBeTruthy();

  const approve = screen.getByRole('region', { name: 'Approve' });
  expect(within(approve).getByText('P-ENG-19')).toBeTruthy();
  expect(within(approve).getByText('Approve the spec: Spec review -> TDR, as owner')).toBeTruthy();
  expect(within(approve).getByText('2 days')).toBeTruthy();
  expect(within(approve).getByRole('link', { name: 'Open Read-only share links' }).getAttribute('href')).toBe('/gate/P-ENG-19/g7');

  const decide = screen.getByRole('region', { name: 'Decide' });
  expect(within(decide).getByText('Draw and approve UI')).toBeTruthy();
  expect(within(decide).getByText('1 day')).toBeTruthy();
  expect(within(decide).getByRole('link', { name: 'Open Folder templates' }).getAttribute('href')).toBe('/f/P-ENG-21');

  expect(within(screen.getByRole('navigation', { name: 'Main' })).getByLabelText('2 waiting')).toBeTruthy();
  expect(callsTo(f, 'GET', '/api/board?mine=1')).toHaveLength(1);
});

test('/waiting with nothing says so, and uses the team picked on the board', async () => {
  localStorage.setItem('jflow-team', 'CORE');
  routeFetch({ 'GET /api/me': reply(200, me()), 'GET /api/board?team=CORE&mine=1': reply(200, board([])) });
  renderAt('/waiting');
  expect(await screen.findByText('Nothing waits for you.')).toBeTruthy();
  expect(screen.queryByRole('region', { name: 'Approve' })).toBeNull();
  expect((screen.getByRole('combobox', { name: 'Team' }) as HTMLSelectElement).value).toBe('CORE');
});

test('on other pages the header asks for the waiting count itself', async () => {
  routeFetch({ 'GET /api/me': reply(200, me()), 'GET /api/board?mine=1': reply(200, board([ui, gated])) });
  render(<AppHeader />);
  expect(await screen.findByLabelText('2 waiting')).toBeTruthy();
});
