export type ReviewPr = {
  repo: string; number: number; title: string; url: string; author: string; updatedAt: string;
  feature: { key: string; name: string } | null;
};
export type ReviewTdr = { title: string; path: string; url: string | null };
export type TdrInReview = ReviewTdr & { reviewers: string[] };
export type Reviews = { github: 'none' | 'ok' | 'failed'; prs: ReviewPr[]; tdrs: ReviewTdr[] };
