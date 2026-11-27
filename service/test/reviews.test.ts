import { describe, expect, it } from 'vitest';
import { docsUrlOf } from '../src/reviews/docsUrlOf.js';
import { pendingReviewersOf } from '../src/reviews/pendingReviewersOf.js';
import { tdrTitleOf } from '../src/reviews/tdrTitleOf.js';

const TDR = (status: string, reviewers: string, heading = '## **Reviewers**') => `# TDR Customer keys

Status: ${status}
Owner: @Alex Klimiankov

## Context

- [ ]  @Not A Reviewer

${heading}

- [ ]  @Alex Klimiankov
- [x]  @Kevin Nguyen
- [ ]  *@Luís Vendrame*
- [ ]  a*dd your own name*
${reviewers}
## Decision

- [ ]  @After The Section
`;

describe('pendingReviewersOf', () => {
  it('lists the unchecked people under Reviewers of a TDR in review', () => {
    expect(pendingReviewersOf(TDR('In Review', ''))).toEqual(['Alex Klimiankov', 'Luís Vendrame']);
  });
  it('accepts the plain heading, any case of the status, and a bold or table status line', () => {
    expect(pendingReviewersOf(TDR('in review', '', '## Reviewers'))).toEqual(['Alex Klimiankov', 'Luís Vendrame']);
    expect(pendingReviewersOf(TDR('In Review', '').replace('Status: In Review', '**Status:** In Review'))).toHaveLength(2);
    expect(pendingReviewersOf(TDR('In Review', '').replace('Status: In Review', '| Status | In Review |'))).toHaveLength(2);
  });
  it('is empty unless the TDR is In Review', () => {
    expect(pendingReviewersOf(TDR('Draft', ''))).toEqual([]);
    expect(pendingReviewersOf(TDR('Accepted', ''))).toEqual([]);
    expect(pendingReviewersOf('# TDR\n\n## Reviewers\n\n- [ ] @Ann\n')).toEqual([]);
  });
});

describe('tdrTitleOf and docsUrlOf', () => {
  it('names a TDR by its file', () => {
    expect(tdrTitleOf('TDR-Customer-managed-keys.md')).toBe('Customer managed keys');
    expect(tdrTitleOf('TDR Platform V2.md')).toBe('Platform V2');
  });
  it('links the file in Studio, or null without a Studio address', () => {
    expect(docsUrlOf('https://studio.jitera.app/p/core/chat?a=agent-1', 'documents/Technical Design Record (TDR)/TDR X.md'))
      .toBe('https://studio.jitera.app/p/core/docs/%2FTechnical%20Design%20Record%20(TDR)%2FTDR%20X.md');
    expect(docsUrlOf('', 'documents/T/x.md')).toBeNull();
  });
});
