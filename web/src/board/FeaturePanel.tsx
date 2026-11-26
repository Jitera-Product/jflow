import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { getFeaturePanel } from '@/api/getFeaturePanel';
import { getMe } from '@/api/getMe';
import type { FeaturePanelView } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { StatePanel } from '@/shell/StatePanel';
import { chatLink } from './chatLink';

const LINK = 'text-primary underline underline-offset-4';

export function FeaturePanel({ featureKey, onClose }: { featureKey: string; onClose: () => void }) {
  const [view, setView] = useState<FeaturePanelView | null>(null);
  const [agentUrl, setAgentUrl] = useState('');
  const [failed, setFailed] = useState<unknown>(null);
  const close = useRef<HTMLButtonElement>(null);

  // Focus moves into the panel; on close it goes back to the card that opened it, if any.
  useEffect(() => {
    const opener = document.activeElement;
    close.current?.focus();
    return () => {
      if (opener instanceof HTMLElement && opener !== document.body && opener.isConnected) opener.focus();
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // The New idea dialog prevents its Escape, so it closes only that dialog.
      if (e.key === 'Escape' && !e.defaultPrevented) onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    let live = true;
    setView(null);
    setFailed(null);
    // Shown together, so the chat link does not pop in after the panel. Without /api/me there is just no link.
    Promise.all([getFeaturePanel(featureKey), getMe().then((m) => m.flowAgentUrl, () => '')]).then(
      ([v, url]) => {
        if (!live) return;
        setView(v);
        setAgentUrl(url);
      },
      (e) => live && setFailed(e),
    );
    return () => {
      live = false;
    };
  }, [featureKey]);

  const c = view?.card;
  const chat = view?.folder && agentUrl ? chatLink(agentUrl, view.folder) : null;
  const title = c ? (c.id ? `${c.id} ${c.name}` : c.name) : featureKey;
  return (
    <aside
      role="dialog"
      aria-label={title}
      className="bg-background fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col gap-6 overflow-y-auto border-l p-6 text-sm shadow-lg"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-lg leading-tight font-semibold wrap-anywhere">{title}</h2>
        <Button ref={close} variant="ghost" size="icon-sm" aria-label="Close" onClick={onClose}>
          <X />
        </Button>
      </div>
      {failed ? (
        <StatePanel error={failed} />
      ) : !view || !c ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : (
        <>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
            <dt className="text-muted-foreground">Stage</dt>
            <dd>{c.stage}</dd>
            <dt className="text-muted-foreground">Owner</dt>
            <dd>{c.owner?.name ?? 'No owner'}</dd>
          </dl>
          {view.notice && <p className="rounded-md bg-secondary px-3 py-2">{view.notice}</p>}
          {c.notStarted && <p className="rounded-md bg-secondary px-3 py-2">Not started in jflow</p>}
          {view.behind && <p className="rounded-md bg-secondary px-3 py-2">{`The status file is behind: Linear says ${c.stage}.`}</p>}
          {view.gate && (
            <section className="flex flex-col gap-2 rounded-md border px-3 py-2">
              <h3 className="font-medium">Open gate</h3>
              <p>{`${view.gate.from} -> ${view.gate.to}, waiting for ${view.gate.missing.join(', ')}`}</p>
              <a className={LINK} href={view.gate.url}>Open the gate</a>
            </section>
          )}
          {view.stages.length > 0 && (
            <section className="flex flex-col gap-2">
              <h3 className="font-medium">Stages</h3>
              <table className="w-full">
                <tbody>
                  {view.stages.map((s) => (
                    <tr key={s.stage} className="border-t first:border-t-0">
                      <td className="py-1 pr-3">{s.stage}</td>
                      <td className="text-muted-foreground py-1 pr-3">{s.status}</td>
                      <td className="text-muted-foreground py-1 tabular-nums">{s.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
          {view.log.length > 0 && (
            <section className="flex flex-col gap-2">
              <h3 className="font-medium">Log</h3>
              <ul className="flex flex-col gap-1">
                {view.log.map((l, i) => (
                  <li key={i} className="wrap-anywhere">{[l.date, l.stage, l.who, l.text].filter(Boolean).join(' - ')}</li>
                ))}
              </ul>
            </section>
          )}
          {view.files.length > 0 && (
            <section className="flex flex-col gap-2">
              <h3 className="font-medium">Files</h3>
              <ul className="flex flex-col gap-1">
                {view.files.map((f) => <li key={f} className="wrap-anywhere">{f}</li>)}
              </ul>
            </section>
          )}
          {chat && <a className={LINK} href={chat} target="_blank" rel="noopener noreferrer">Open in Jitera chat</a>}
          <a className={LINK} href={view.linearUrl} target="_blank" rel="noopener noreferrer">Open in Linear</a>
        </>
      )}
    </aside>
  );
}
