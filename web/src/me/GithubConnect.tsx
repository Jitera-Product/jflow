import { type FormEvent, useId, useState } from 'react';
import { ApiError } from '@/api/ApiError';
import { connectGithub } from '@/api/connectGithub';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';

export function GithubConnect({ onConnected }: { onConnected: (login: string) => void }) {
  const id = useId();
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { login } = await connectGithub(token);
      setToken('');
      onConnected(login);
    } catch (err) {
      setError(err instanceof ApiError && err.status === 400 && err.message ? err.message : 'Could not connect. Try again.');
    }
    setBusy(false);
  };

  return (
    <form onSubmit={submit} className="grid gap-2">
      <Label htmlFor={id}>GitHub token</Label>
      <div className="flex flex-wrap gap-2">
        <div className="min-w-0 flex-[1_1_240px]">
          <Input id={id} type="password" autoComplete="off" aria-describedby={`${id}-hint`} value={token} onChange={(e) => setToken(e.target.value)} />
        </div>
        <Button type="submit" loading={busy} disabled={!token.trim()}>Connect</Button>
      </div>
      <p id={`${id}-hint`} className="text-muted-foreground">
        A fine-grained token: resource owner your GitHub organization, read-only Pull requests on its repositories. jflow uses it only to find the pull requests waiting for your review.
      </p>
      {error && <p role="alert" className="text-error-text">{error}</p>}
    </form>
  );
}
