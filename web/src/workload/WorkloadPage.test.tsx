import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { me } from '@/test/boardFixture';
import { callsTo, reply, routeFetch } from '@/test/routeFetch';
import type { BoardResponse } from './types';
import { WorkloadPage } from './WorkloadPage';

beforeEach(() => {
  localStorage.clear();
  history.replaceState(null, '', '/workload');
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const data: BoardResponse = {
  summary: { people: 1, active: 5, offBoard: 2, noProject: 1, share: 0.4, agentReady: 1, agentReview: 0 },
  people: [{
    person: { id: 'p1', name: 'Mika' },
    ownProjects: [{ id: 'pr1', name: 'Search', url: 'https://linear.app/x/project/search', status: 'Started', statusType: 'started', role: 'lead', count: 3 }],
    otherProjects: [{ name: 'Billing', kind: 'off_board_project', count: 1 }],
    noProject: [{ issue: { id: 'ENG-9', title: 'Fix login', url: 'https://linear.app/x/issue/ENG-9', status: 'Todo' }, stuck: true }],
    agent: [{ issue: { id: 'ENG-7', title: 'Bump deps', url: 'https://linear.app/x/issue/ENG-7', status: 'Todo' }, state: 'ready' }],
    bar: { own: 3, outside: 1, ready: 1 },
    outsideCount: 2,
    forecast: { kind: 'ok', weeks: 1.5, queue: 4, perWeek: 2.5 },
  }],
  notOnBoard: [{ person: { id: 'p2', name: 'Kai' }, issues: 2, noProject: 1 }],
  settings: { paceDays: 21, minClosures: 3, stuckHours: 48 },
  window: '-P30D',
  updatedAt: '2026-11-26T10:00:00.000Z',
};

const options = { teams: [{ id: 't1', name: 'Engineering' }, { id: 't2', name: 'Core' }], statuses: [{ id: 's1', name: 'Todo' }] };

test('renders the workload from /api/workload and the filters from /api/workload/options', async () => {
  const f = routeFetch({
    'GET /api/me': reply(200, me()),
    'GET /api/workload/options': reply(200, options),
    'GET /api/workload?window=-P30D': reply(200, data),
  });
  render(<WorkloadPage />);
  const card = (await screen.findByRole('heading', { name: 'Mika' })).closest('article')!;
  expect(within(card).getByText('2 outside')).toBeTruthy();
  expect(within(card).getByRole('link', { name: /Search/ }).getAttribute('href')).toBe('https://linear.app/x/project/search');
  expect(within(card).getByText('Fix login')).toBeTruthy();
  expect(within(card).getByText('/flow:quick ENG-7')).toBeTruthy();
  expect(within(card).getByText('~1.5 weeks')).toBeTruthy();
  expect(screen.getByText('Kai')).toBeTruthy();
  expect(screen.getByText('40%')).toBeTruthy();
  expect(callsTo(f, 'GET', '/api/workload/options')).toHaveLength(1);
  expect(await screen.findByText('Engineering')).toBeTruthy();
});

test('filters come from the link and go back into it', async () => {
  history.replaceState(null, '', '/workload?window=-P14D&team=t1');
  const f = routeFetch({
    'GET /api/me': reply(200, me()),
    'GET /api/workload/options': reply(200, options),
    'GET /api/workload?window=-P14D&team=t1': reply(200, { ...data, window: '-P14D' }),
    'GET /api/workload?window=-P90D&team=t1': reply(200, { ...data, window: '-P90D' }),
    'GET /api/workload?window=-P90D&team=t1&refresh=1': reply(200, data),
  });
  const user = userEvent.setup();
  render(<WorkloadPage />);
  await screen.findByRole('heading', { name: 'Mika' });
  expect(callsTo(f, 'GET', '/api/workload?window=-P14D&team=t1')).toHaveLength(1);

  await user.selectOptions(screen.getByRole('combobox'), '-P90D');
  await vi.waitFor(() => expect(callsTo(f, 'GET', '/api/workload?window=-P90D&team=t1')).toHaveLength(1));
  expect(new URLSearchParams(location.search).get('window')).toBe('-P90D');
  expect(new URLSearchParams(location.search).get('team')).toBe('t1');

  await user.click(screen.getByRole('button', { name: 'Refresh data' }));
  await vi.waitFor(() => expect(callsTo(f, 'GET', '/api/workload?window=-P90D&team=t1&refresh=1')).toHaveLength(1));
});

test('a failed load says so', async () => {
  routeFetch({
    'GET /api/me': reply(200, me()),
    'GET /api/workload/options': reply(200, options),
    'GET /api/workload?window=-P30D': reply(502, { error: 'linear', message: 'Linear did not answer. Check the key and try again.' }),
  });
  render(<WorkloadPage />);
  expect(await screen.findByText('Failed to load: Linear did not answer. Check the key and try again.')).toBeTruthy();
});
