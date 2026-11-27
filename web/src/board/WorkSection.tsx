import type { BuildRow } from '@/api/types';
import { MaybeLink } from './MaybeLink';
import { PanelSection } from './PanelSection';
import { Pill } from './Pill';
import { workChipOf } from './workChipOf';

export function WorkSection({ build }: { build: BuildRow[] }) {
  return (
    <PanelSection title="Work">
      <ul className="flex flex-col gap-2 text-[13px]">
        {build.map((r, i) => {
          const chip = workChipOf(r);
          return (
            <li key={`${r.issue}-${i}`} className="grid grid-cols-[90px_minmax(0,1fr)_auto] items-center gap-2.5 rounded-lg border px-3 py-2.5">
              <span className="text-muted-foreground font-mono text-xs wrap-anywhere">{r.issue}</span>
              <span className="min-w-0 wrap-anywhere">
                {r.pr !== null ? (
                  <MaybeLink href={r.url} className="text-muted-foreground font-mono text-xs">{`${r.repo} #${r.pr}`}</MaybeLink>
                ) : (
                  <span className="text-muted-foreground font-mono text-xs">{r.repo ? `${r.repo}, no PR yet` : 'No PR yet'}</span>
                )}
              </span>
              {chip ? <Pill tone={chip.tone}>{chip.text}</Pill> : <span />}
            </li>
          );
        })}
      </ul>
    </PanelSection>
  );
}
