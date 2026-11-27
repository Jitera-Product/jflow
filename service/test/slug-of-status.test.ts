import { describe, expect, it } from 'vitest';
import { slugOfStatus } from '../src/board/slugOfStatus.js';

describe('slugOfStatus', () => {
  it.each([
    'Linear: https://linear.app/jitera-product/project/us-region-decommissioning-and-cleanup-33293140d6c1',
    'Linear: <https://linear.app/jitera-product/project/us-region-decommissioning-and-cleanup-33293140d6c1>',
    'Linear: [US Region](https://linear.app/jitera-product/project/us-region-decommissioning-and-cleanup-33293140d6c1/overview)',
  ])('reads the slugId from %j', (line) => {
    expect(slugOfStatus(`# Status\n\n${line}\n`)).toBe('33293140d6c1');
  });
  it('is null without the line', () => {
    expect(slugOfStatus('# Status\n\nLinear: <project URL>\n')).toBeNull();
  });
});
