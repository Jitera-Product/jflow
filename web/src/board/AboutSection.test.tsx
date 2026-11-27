import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, test } from 'vitest';
import { AboutSection } from './AboutSection';
import { PostsSection } from './PostsSection';

afterEach(cleanup);

const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

test('About shows the summary and the Markdown body, without raw HTML or http images', () => {
  const content = [
    '## Goal',
    'Read the [spec](https://example.com/spec) and run `npm test`.',
    '- one',
    '- two',
    '<b>bold html</b>',
    '<script>alert(1)</script>',
    '![safe](https://example.com/a.png) ![unsafe](http://example.com/b.png)',
  ].join('\n\n');
  const { container } = render(<AboutSection summary="Export the board to CSV" content={content} />);
  expect(screen.getByRole('heading', { name: 'About' })).toBeTruthy();
  expect(screen.getByText('Export the board to CSV')).toBeTruthy();
  expect(screen.getByRole('heading', { name: 'Goal' })).toBeTruthy();
  const link = screen.getByRole('link', { name: 'spec' });
  expect(link.getAttribute('target')).toBe('_blank');
  expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  expect(screen.getByText('npm test').tagName).toBe('CODE');
  expect(screen.getAllByRole('listitem')).toHaveLength(2);
  expect(container.querySelector('b, script')).toBeNull();
  expect(container.textContent).not.toContain('alert(1)');
  expect(screen.getByRole('img', { name: 'safe' })).toBeTruthy();
  expect(screen.queryByRole('img', { name: 'unsafe' })).toBeNull();
});

test('About folds long content behind Show more', async () => {
  const content = Array.from({ length: 30 }, (_, i) => `Line ${i + 1}`).join('\n\n');
  render(<AboutSection summary="" content={content} />);
  const body = screen.getByTestId('about-body');
  expect(body.className).toContain('max-h-');
  await userEvent.click(screen.getByRole('button', { name: 'Show more' }));
  expect(body.className).not.toContain('max-h-');
  await userEvent.click(screen.getByRole('button', { name: 'Show less' }));
  expect(body.className).toContain('max-h-');
});

test('About has no toggle for short content, and is empty without summary or content', () => {
  render(<AboutSection summary="Short" content="One line" />);
  expect(screen.queryByRole('button', { name: 'Show more' })).toBeNull();
  cleanup();
  const { container } = render(<AboutSection summary="" content="" />);
  expect(container.innerHTML).toBe('');
});

test('Updates show the author, a relative date, the health and the body', () => {
  render(
    <PostsSection
      title="Updates"
      posts={[
        { author: 'Mika', createdAt: daysAgo(2), body: 'On **plan**', health: 'onTrack' },
        { author: 'Ken', createdAt: daysAgo(0), body: 'Slipping', health: 'atRisk' },
        { author: 'Bo', createdAt: daysAgo(1), body: 'Blocked', health: 'offTrack' },
      ]}
    />,
  );
  expect(screen.getByRole('heading', { name: 'Updates' })).toBeTruthy();
  expect(screen.getByText('Mika')).toBeTruthy();
  expect(screen.getByText('2 days ago')).toBeTruthy();
  expect(screen.getByText('today')).toBeTruthy();
  expect(screen.getByText('yesterday')).toBeTruthy();
  expect(screen.getByText('On track').className).toContain('bg-success-bg');
  expect(screen.getByText('At risk').className).toContain('bg-waits-bg');
  expect(screen.getByText('Off track').className).toContain('bg-error-bg');
  expect(screen.getByText('plan').tagName).toBe('STRONG');
});

test('a section with no posts renders nothing', () => {
  const { container } = render(<PostsSection title="Comments" posts={[]} />);
  expect(container.innerHTML).toBe('');
});
