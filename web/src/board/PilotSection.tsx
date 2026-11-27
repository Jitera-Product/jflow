import type { BoardCard } from '@/api/types';
import { PanelSection } from './PanelSection';
import { Pill } from './Pill';
import { pilotLineOf } from './pilotLineOf';

export function PilotSection({ card }: { card: BoardCard }) {
  return (
    <PanelSection title="Pilot">
      {card.pilotMismatch ? (
        <div className="flex flex-wrap items-center gap-2.5 text-[13px]">
          <Pill tone="fail">Pilot mismatch</Pill>
          <span>{pilotLineOf(card.build)}</span>
          <span className="text-muted-foreground">Put every open PR of the feature on the same pilot.</span>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2.5 text-[13px]">
          <Pill tone="quiet" mono>{card.pilot}</Pill>
          <span>Every open PR of the feature is on this pilot.</span>
        </div>
      )}
    </PanelSection>
  );
}
