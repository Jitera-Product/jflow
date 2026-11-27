import { useEffect, useState } from 'react';
import { forgetGithub } from '@/api/forgetGithub';
import { getMe } from '@/api/getMe';
import type { Me } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { SettingsSection } from '@/settings/SettingsSection';
import { AppHeader } from '@/shell/AppHeader';
import { StatePanel } from '@/shell/StatePanel';
import { GithubConnect } from './GithubConnect';

export function MePage() {
  const [me, setMe] = useState<Me | null>(null);
  const [failed, setFailed] = useState<unknown>(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    getMe().then(setMe, setFailed);
  }, []);

  const remove = async () => {
    setRemoving(true);
    await forgetGithub().then(() => me && setMe({ ...me, github: null }), setFailed);
    setRemoving(false);
  };

  return (
    <div className="bg-muted min-h-dvh">
      <AppHeader me={me} />
      <main className="mx-auto flex w-full max-w-xl flex-col gap-6 px-4 py-12 text-sm">
        <h1 className="text-2xl leading-tight font-semibold tracking-[-0.01em]">{me?.email ?? 'Me'}</h1>
        {failed ? (
          <StatePanel error={failed} />
        ) : !me ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : (
          <SettingsSection id="github" title="GitHub">
            {me.github ? (
              <div className="flex flex-wrap items-center gap-3">
                <span>Connected as <b className="font-semibold">@{me.github.login}</b></span>
                <Button variant="outline" loading={removing} onClick={remove}>Remove</Button>
              </div>
            ) : (
              <GithubConnect onConnected={(login) => setMe({ ...me, github: { login } })} />
            )}
          </SettingsSection>
        )}
      </main>
    </div>
  );
}
