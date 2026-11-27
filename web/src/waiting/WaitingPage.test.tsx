import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { board, card, me } from '@/test/boardFixture';
import { renderAt } from '@/test/renderAt';
import { bodyOf, callsTo, reply, routeFetch } from '@/test/routeFetch';
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

const reviews = (o: Record<string, unknown> = {}) => ({
  github: 'ok',
  prs: [
    { repo: 'acme/frontend-core', number: 2301, title: 'Alert settings page', url: 'https://github.com/acme/frontend-core/pull/2301', author: 'bo', updatedAt: '2026-11-26T09:00:00.000Z', feature: { key: 'P-ENG-18', name: 'Usage alerts in Slack' } },
    { repo: 'acme/boost', number: 7, title: 'Fix routing', url: 'https://github.com/acme/boost/pull/7', author: 'bo', updatedAt: '2026-11-26T09:00:00.000Z', feature: null },
  ],
  tdrs: [
    { title: 'Customer keys', path: 'documents/TDR/TDR Customer keys.md', url: 'https://studio.example.com/p/core/docs/x' },
    { title: 'No link', path: 'documents/TDR/TDR No link.md', url: null },
  ],
  ...o,
});

test('/waiting adds the PRs and TDRs waiting for my review, and counts them in the header', async () => {
  routeFetch({ 'GET /api/me': reply(200, me()), 'GET /api/board?mine=1': reply(200, board([ui])), 'GET /api/waiting/reviews': reply(200, reviews()) });
  renderAt('/waiting');
  const code = await screen.findByRole('region', { name: 'Review code' });
  expect(within(code).getByText('Usage alerts in Slack')).toBeTruthy();
  expect(within(code).getByText('frontend-core #2301')).toBeTruthy();
  expect(within(code).getByRole('link', { name: 'Open PR Alert settings page' }).getAttribute('href')).toBe('https://github.com/acme/frontend-core/pull/2301');
  expect(within(code).getByText('boost')).toBeTruthy();
  expect(within(code).getByText('Fix routing')).toBeTruthy();

  const tdr = screen.getByRole('region', { name: 'Review TDR' });
  expect(within(tdr).getByRole('link', { name: 'Open TDR Customer keys' }).getAttribute('href')).toBe('https://studio.example.com/p/core/docs/x');
  expect(within(tdr).getByText('No link')).toBeTruthy();
  expect(within(tdr).queryByRole('link', { name: 'Open TDR No link' })).toBeNull();

  expect(within(screen.getByRole('navigation', { name: 'Main' })).getByLabelText('5 waiting')).toBeTruthy();
  expect(screen.getByText('5 things. The oldest has waited 1 day.')).toBeTruthy();
  expect(screen.queryByRole('region', { name: 'Connect GitHub' })).toBeNull();
});

test('/waiting without a GitHub token asks to connect one, then shows the PRs', async () => {
  const f = routeFetch({
    'GET /api/me': reply(200, me()),
    'GET /api/board?mine=1': reply(200, board([])),
    'GET /api/waiting/reviews': [reply(200, reviews({ github: 'none', prs: [], tdrs: [] })), reply(200, reviews())],
    'POST /api/me/github': [reply(400, { error: 'github', message: 'GitHub did not accept this token.' }), reply(200, { login: 'mika-gh' })],
  });
  renderAt('/waiting');
  const callout = await screen.findByRole('region', { name: 'Connect GitHub' });
  expect(within(callout).getByText('Connect GitHub to see the pull requests waiting for your review.')).toBeTruthy();
  const input = within(callout).getByLabelText('GitHub token');
  fireEvent.change(input, { target: { value: 'bad' } });
  fireEvent.click(within(callout).getByRole('button', { name: 'Connect' }));
  expect((await within(callout).findByRole('alert')).textContent).toBe('GitHub did not accept this token.');
  fireEvent.change(input, { target: { value: 'good' } });
  fireEvent.click(within(callout).getByRole('button', { name: 'Connect' }));
  expect(await screen.findByRole('region', { name: 'Review code' })).toBeTruthy();
  expect(bodyOf(f, 'POST', '/api/me/github', 1)).toEqual({ token: 'good' });
  expect(screen.queryByRole('region', { name: 'Connect GitHub' })).toBeNull();
});

test('/waiting when GitHub fails says so and links to /me', async () => {
  routeFetch({ 'GET /api/me': reply(200, me()), 'GET /api/board?mine=1': reply(200, board([])), 'GET /api/waiting/reviews': reply(200, reviews({ github: 'failed', prs: [] })) });
  renderAt('/waiting');
  expect(await screen.findByText(/GitHub did not answer; pull requests are not shown\./)).toBeTruthy();
  expect(screen.getByRole('link', { name: 'Check your GitHub token' }).getAttribute('href')).toBe('/me');
});
