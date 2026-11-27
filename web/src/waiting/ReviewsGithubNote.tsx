import type { Reviews } from '@/api/types';
import { GithubConnect } from '@/me/GithubConnect';

export function ReviewsGithubNote({ github, onConnected }: { github: Reviews['github']; onConnected: () => void }) {
  if (github === 'failed') {
    return (
      <p role="status" className="text-muted-foreground">
        GitHub did not answer; pull requests are not shown. <a href="/me" className="text-foreground underline underline-offset-2">Check your GitHub token</a>
      </p>
    );
  }
  if (github !== 'none') return null;
  return (
    <section aria-label="Connect GitHub" className="bg-card flex flex-col gap-3 rounded-xl border p-4 shadow-sm">
      <p className="font-medium">Connect GitHub to see the pull requests waiting for your review.</p>
      <GithubConnect onConnected={onConnected} />
    </section>
  );
}
