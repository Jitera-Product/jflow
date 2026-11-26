import { ApiError } from '@/api/ApiError';
import { Card } from '@/components/ui/Card';

const titleFor = (status: number) =>
  status === 401 ? 'Sign in' : status === 403 ? 'Not allowed' : status === 404 ? 'Not found' : 'Something went wrong';

export function StatePanel({ error }: { error: unknown }) {
  const status = error instanceof ApiError ? error.status : 0;
  const message =
    status === 401 ? 'Sign in through Cloudflare Access, then open this page again.'
    : error instanceof ApiError && error.message ? error.message
    : 'jflow did not answer. Reload the page to try again.';
  return (
    <Card className="px-6">
      <h1 className="text-lg leading-none font-semibold">{titleFor(status)}</h1>
      <p>{message}</p>
    </Card>
  );
}
