import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test, vi } from 'vitest';
import type { GateView } from '@/api/types';
import { GatePage } from './GatePage';

const open: GateView = {
  email: 'mika@example.com',
  project: 'P-ENG-12',
  feature: 'Search filters',
  from: 'tdr',
  to: 'build',
  toLabel: 'flow:build',
  roles: ['owner', 'engineer'],
  approvals: [{ role: 'engineer', email: 'sam@example.com' }],
  canDecide: true,
  reason: null,
};

const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function stubFetch(first: Response, ...posts: Response[]) {
  const f = vi.fn(async (_url: string, init?: RequestInit) => (init?.method === 'POST' ? posts.shift()! : first));
  vi.stubGlobal('fetch', f);
  return f;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

test('GatePage approve posts decision and to, then shows the new state', async () => {
  const closed = { ...open, approvals: [...open.approvals, { role: 'owner', email: 'mika@example.com' }], canDecide: false, reason: 'This gate is closed (approved).' };
  const f = stubFetch(reply(200, open), reply(200, closed));
  const user = userEvent.setup();
  render(<GatePage project="P-ENG-12" gate="gABC" />);
  expect(await screen.findByText('P-ENG-12 Search filters')).toBeTruthy();
  expect(screen.getByText('tdr -> build')).toBeTruthy();
  expect(screen.getByText('owner, engineer')).toBeTruthy();
  expect(screen.getByText('engineer: sam@example.com')).toBeTruthy();
  expect(screen.getByText('You are mika@example.com')).toBeTruthy();
  expect(f).toHaveBeenCalledWith('/api/gate/P-ENG-12/gABC', expect.objectContaining({ credentials: 'same-origin' }));

  await user.click(screen.getByRole('button', { name: 'Approve' }));
  expect(await screen.findByText('This gate is closed (approved).')).toBeTruthy();
  const [url, init] = f.mock.calls[1]!;
  expect(url).toBe('/api/gate/P-ENG-12/gABC');
  expect(init).toMatchObject({ method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json' } });
  expect(JSON.parse(String(init!.body))).toEqual({ decision: 'approve', to: 'flow:build' });
  expect(screen.getByText('engineer: sam@example.com, owner: mika@example.com')).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull();
});

test('GatePage without canDecide shows the reason and no buttons', async () => {
  stubFetch(reply(200, { ...open, email: 'kai@example.com', canDecide: false, reason: 'kai@example.com cannot decide this gate.' }));
  render(<GatePage project="P-ENG-12" gate="gABC" />);
  expect(await screen.findByText('kai@example.com cannot decide this gate.')).toBeTruthy();
  expect(screen.getByText('You are kai@example.com')).toBeTruthy();
  expect(screen.queryByRole('button')).toBeNull();
});

test('GatePage shows a 409 message', async () => {
  const f = stubFetch(reply(200, open), reply(409, { error: 'moved', message: 'This gate is for a move that already happened.' }));
  const user = userEvent.setup();
  render(<GatePage project="P-ENG-12" gate="gABC" />);
  await user.click(await screen.findByRole('button', { name: 'Request changes' }));
  expect(await screen.findByText('This gate is for a move that already happened.')).toBeTruthy();
  expect(JSON.parse(String(f.mock.calls[1]![1]!.body))).toEqual({ decision: 'changes', to: 'flow:build' });
});
