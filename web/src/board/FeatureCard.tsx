import { Link } from '@tanstack/react-router';
import type { BoardCard } from '@/api/types';
import { Avatar } from '@/components/ui/Avatar';
import { cn } from '@/lib/cn';
import { daysText } from '@/lib/daysText';
import { gateDaysOf } from './gateDaysOf';
import { progressOf } from './progressOf';
import { StageChip } from './StageChip';
import { StatusChip } from './StatusChip';
import { statusChipOf } from './statusChipOf';

// at: when the board was read, for the stuck days
export function FeatureCard({ card, at }: { card: BoardCard; at: string }) {
  const chip = statusChipOf(card);
  const done = card.stage === 'Done';
  return (
    <Link
      to="/f/$id"
      params={{ id: card.key }}
      className={cn(
        'bg-card flex flex-col gap-2.5 rounded-xl border p-3.5 shadow-sm outline-none hover:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
        card.stuck && 'border-error-border',
        chip?.tone === 'you' && 'ring-2 ring-primary',
      )}
    >
      <div className="flex items-center gap-2 text-xs">
        {card.id ? <span className="text-muted-foreground font-mono">{card.id}</span> : card.notStarted && <span className="text-muted-foreground">Not started in jflow</span>}
        <StageChip stage={card.stage} className="ml-auto" />
      </div>
      <span className="text-[15px] font-semibold wrap-anywhere">{card.name}</span>
      <div aria-hidden="true" className="bg-secondary h-1 overflow-hidden rounded-full">
        <span className={cn('block h-full rounded-full', done ? 'bg-success-text' : 'bg-primary')} style={{ width: `${progressOf(card.stage) * 100}%` }} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {card.notStarted ? (
          card.owner && <span className="text-muted-foreground text-xs">{`From ${card.owner.name}`}</span>
        ) : card.owner ? (
          <>
            <Avatar name={card.owner.name} />
            <span className="text-[13px]">{card.owner.name}</span>
          </>
        ) : (
          <span className="text-muted-foreground text-xs">No owner</span>
        )}
        {chip && <StatusChip chip={chip} className="ml-auto" />}
      </div>
      {card.stuck && card.openGate && (
        <span className="bg-error-bg text-error-text inline-flex h-6 items-center gap-1.5 self-start rounded-full px-2 text-xs font-medium">
          <span aria-hidden="true" className="bg-error-text size-1.5 rounded-full" />
          {`Stuck: approval waits ${daysText(gateDaysOf(card.openGate, at))}`}
        </span>
      )}
    </Link>
  );
}
