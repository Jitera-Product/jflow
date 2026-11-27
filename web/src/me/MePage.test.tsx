import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { board, me } from '@/test/boardFixture';
import { renderAt } from '@/test/renderAt';
import { bodyOf, callsTo, reply, routeFetch } from '@/test/routeFetch';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const background = { 'GET /api/board?mine=1': reply(200, board([])), 'GET /api/waiting/reviews': reply(500) };

test('/me without GitHub: connect a token, then it says who you are on GitHub', async () => {
  const f = routeFetch({ ...background, 'GET /api/me': reply(200, me()), 'POST /api/me/github': reply(200, { login: 'mika-gh' }) });
  renderAt('/me');
  fireEvent.change(await screen.findByLabelText('GitHub token'), { target: { value: 'tok' } });
  expect(screen.getByText(/resource owner your GitHub organization, read-only Pull requests/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Connect' }));
  expect(await screen.findByText('@mika-gh')).toBeTruthy();
  expect(bodyOf(f, 'POST', '/api/me/github')).toEqual({ token: 'tok' });
});

test('/me with GitHub: shows the login and removes the token', async () => {
  const f = routeFetch({ ...background, 'GET /api/me': reply(200, me({ github: { login: 'mika-gh' } })), 'DELETE /api/me/github': reply(204) });
  renderAt('/me');
  expect((await screen.findByText(/Connected as/)).textContent).toBe('Connected as @mika-gh');
  fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
  expect(await screen.findByLabelText('GitHub token')).toBeTruthy();
  expect(callsTo(f, 'DELETE', '/api/me/github')).toHaveLength(1);
});

test('the header avatar links to /me', async () => {
  routeFetch({ ...background, 'GET /api/me': reply(200, me()) });
  renderAt('/me');
  expect((await screen.findByRole('link', { name: 'mika@example.com' })).getAttribute('href')).toBe('/me');
});
