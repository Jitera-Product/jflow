import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test } from 'vitest';
import { ThemeToggle } from './ThemeToggle';

afterEach(() => {
  localStorage.clear();
  document.documentElement.classList.remove('dark');
});

test('light by default; the toggle switches to dark and back and remembers it', async () => {
  const user = userEvent.setup();
  render(<ThemeToggle />);
  expect(document.documentElement.classList.contains('dark')).toBe(false);

  await user.click(screen.getByRole('button', { name: 'Dark theme' }));
  expect(document.documentElement.classList.contains('dark')).toBe(true);
  expect(localStorage.getItem('jflow-theme')).toBe('dark');

  await user.click(screen.getByRole('button', { name: 'Light theme' }));
  expect(document.documentElement.classList.contains('dark')).toBe(false);
  expect(localStorage.getItem('jflow-theme')).toBe('light');
});

test('a saved dark choice shows the light-theme button', () => {
  localStorage.setItem('jflow-theme', 'dark');
  render(<ThemeToggle />);
  expect(screen.getByRole('button', { name: 'Light theme' })).toBeTruthy();
});
