import { useEffect, useState } from 'react';
import { ApiError } from '@/api/ApiError';
import { decideGate } from '@/api/decideGate';
import { getGate } from '@/api/getGate';
import type { Decision, GateView } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageShell } from '@/shell/PageShell';
import { StatePanel } from '@/shell/StatePanel';

export function GatePage({ project, gate }: { project: string; gate: string }) {
  const [view, setView] = useState<GateView | null>(null);
  const [failed, setFailed] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<Decision['decision'] | null>(null);

  useEffect(() => {
    getGate(project, gate).then(setView, setFailed);
  }, [project, gate]);

  const decide = async (decision: Decision['decision'], to: string) => {
    setBusy(decision);
    setError(null);
    try {
      setView(await decideGate(project, gate, { decision, to }));
    } catch (e) {
      setError((e instanceof ApiError && e.message) || 'Could not send your decision. Reload the page and try again.');
    } finally {
      setBusy(null);
    }
  };

  if (failed) {
    return (
      <PageShell>
        <StatePanel error={failed} />
      </PageShell>
    );
  }
  if (!view) {
    return (
      <PageShell>
        <p className="text-muted-foreground">Loading...</p>
      </PageShell>
    );
  }
  return (
    <PageShell>
      <Card className="px-6">
        <h1 className="text-lg leading-none font-semibold wrap-anywhere">{`${view.project} ${view.feature}`}</h1>
        <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-3">
          <dt className="text-muted-foreground">Move</dt>
          <dd className="min-w-0">{`${view.from} -> ${view.to}`}</dd>
          <dt className="text-muted-foreground">Needs</dt>
          <dd className="min-w-0">{view.roles.join(', ')}</dd>
          <dt className="text-muted-foreground">Approved by</dt>
          <dd className="min-w-0 wrap-anywhere">
            {view.approvals.map((a) => `${a.role}: ${a.email}`).join(', ') || 'nobody yet'}
          </dd>
        </dl>
        <p className="text-muted-foreground wrap-anywhere">{`You are ${view.email}`}</p>
        {error && (
          <p role="alert" className="rounded-md border border-error-border bg-error-bg px-3 py-2 text-error-text">
            {error}
          </p>
        )}
        {view.canDecide ? (
          <div className="flex flex-wrap gap-2">
            <Button loading={busy === 'approve'} disabled={busy === 'changes'} onClick={() => decide('approve', view.toLabel)}>
              Approve
            </Button>
            <Button variant="outline" loading={busy === 'changes'} disabled={busy === 'approve'} onClick={() => decide('changes', view.toLabel)}>
              Request changes
            </Button>
          </div>
        ) : (
          <p className="rounded-md bg-secondary px-3 py-2">{view.reason}</p>
        )}
      </Card>
    </PageShell>
  );
}
