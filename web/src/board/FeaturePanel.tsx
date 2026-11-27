import { MessageSquare, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { getFeaturePanel } from '@/api/getFeaturePanel';
import type { FeaturePanelView } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { daysText } from '@/lib/daysText';
import { shortDate } from '@/lib/shortDate';
import { StatePanel } from '@/shell/StatePanel';
import { PanelSection } from './PanelSection';
import { StageChip } from './StageChip';
import { StageTimeline } from './StageTimeline';

const NOTE = 'bg-secondary mx-7 mt-6 rounded-md px-3 py-2';

export function FeaturePanel({ featureKey, onClose }: { featureKey: string; onClose: () => void }) {
  const [view, setView] = useState<FeaturePanelView | null>(null);
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
    getFeaturePanel(featureKey).then(
      (v) => live && setView(v),
      (e) => live && setFailed(e),
    );
    return () => {
      live = false;
    };
  }, [featureKey]);

  const c = view?.card;
  const title = c ? (c.id ? `${c.id} ${c.name}` : c.name) : featureKey;
  const fileMeta = (f: string) => {
    const row = view?.stages.find((s) => s.file === f);
    return row ? [row.by, shortDate(row.date)].filter(Boolean).join(', ') : '';
  };
  return (
    <aside
      role="dialog"
      aria-label={title}
      className="bg-background fixed inset-y-0 right-0 z-40 flex w-full max-w-[600px] flex-col overflow-y-auto border-l text-sm shadow-[-16px_0_40px_rgba(0,0,0,0.06)]"
    >
      <div className="flex flex-col gap-3.5 border-b px-7 pt-6 pb-5">
        <div className="flex items-center gap-2">
          {c?.id && <span className="text-muted-foreground font-mono text-xs">{c.id}</span>}
          {c && <StageChip stage={c.stage} />}
          <Button ref={close} variant="ghost" size="icon" className="ml-auto" aria-label="Close" onClick={onClose}>
            <X />
          </Button>
        </div>
        <h2 className="text-2xl leading-tight font-semibold tracking-[-0.01em] wrap-anywhere">{c?.name ?? featureKey}</h2>
        {c && (
          <>
            <div className="text-muted-foreground flex flex-wrap gap-x-4.5 gap-y-1 text-[13px]">
              <span>Owner <b className="text-foreground font-medium">{c.owner?.name ?? 'No owner'}</b></span>
              <span>{`In ${c.stage} for `}<b className="text-foreground font-medium">{daysText(c.days)}</b></span>
            </div>
            <div className="flex flex-wrap gap-2">
              {view.chatUrl && (
                <Button asChild>
                  <a href={view.chatUrl} target="_blank" rel="noopener noreferrer"><MessageSquare aria-hidden="true" />Open in Jitera chat</a>
                </Button>
              )}
              <Button asChild variant="outline">
                <a href={view.linearUrl} target="_blank" rel="noopener noreferrer">Open in Linear</a>
              </Button>
            </div>
          </>
        )}
      </div>
      {failed ? (
        <div className="p-7"><StatePanel error={failed} /></div>
      ) : !view || !c ? (
        <p className="text-muted-foreground p-7">Loading...</p>
      ) : (
        <>
          {view.notice && <p className={NOTE}>{view.notice}</p>}
          {c.notStarted && <p className={NOTE}>Not started in jflow</p>}
          {view.behind && <p className={NOTE}>{`The status file is behind: Linear says ${c.stage}.`}</p>}
          {view.gate && (
            <PanelSection title="Open gate">
              <p>{`${view.gate.from} -> ${view.gate.to}, waiting for ${view.gate.missing.join(', ')}`}</p>
              <Button asChild variant="primary" className="self-start">
                <a href={view.gate.url}>Open the gate</a>
              </Button>
            </PanelSection>
          )}
          {view.stages.length > 0 && (
            <PanelSection title="Stages">
              <StageTimeline stages={view.stages} />
            </PanelSection>
          )}
          {view.files.length > 0 && (
            <PanelSection title="Documents">
              <ul className="flex flex-col text-[13px]">
                {view.files.map((f) => (
                  <li key={f} className="flex min-h-8 items-center justify-between gap-3">
                    <span className="wrap-anywhere">{f}</span>
                    <span className="text-muted-foreground">{fileMeta(f)}</span>
                  </li>
                ))}
              </ul>
            </PanelSection>
          )}
          {view.log.length > 0 && (
            <PanelSection title="Log">
              <ul className="text-muted-foreground flex flex-col gap-1.5 font-mono text-xs">
                {view.log.map((l, i) => (
                  <li key={i} className="whitespace-pre-wrap wrap-anywhere">{[shortDate(l.date), l.stage, l.who, l.text].filter(Boolean).join('  ')}</li>
                ))}
              </ul>
            </PanelSection>
          )}
        </>
      )}
    </aside>
  );
}
