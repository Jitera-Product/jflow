import { Link } from '@tanstack/react-router';
import type { BoardCard } from '@/api/types';

export function FeatureCard({ card }: { card: BoardCard }) {
  const waits = card.waitsFor.map((w) => w.names.join(', ')).join(' and ');
  return (
    <Link
      to="/f/$id"
      params={{ id: card.key }}
      className="bg-card flex flex-col gap-1.5 rounded-lg border p-3 shadow-xs hover:border-ring focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] outline-none"
    >
      <div className="flex items-center justify-between gap-2 text-xs">
        {card.id ? <span className="text-muted-foreground tabular-nums">{card.id}</span> : <span />}
        {card.stuck && <span className="rounded-full border border-error-border bg-error-bg px-2 text-error-text">Stuck</span>}
      </div>
      <span className="font-medium wrap-anywhere">{card.name}</span>
      <span className="text-muted-foreground text-xs">{card.owner?.name ?? 'No owner'}</span>
      <div className="text-muted-foreground flex flex-col text-xs">
        <span>{`${card.days} ${card.days === 1 ? 'day' : 'days'} in stage`}</span>
        {waits && <span className="wrap-anywhere">{`Waits for ${waits}`}</span>}
        {card.notStarted && <span>Not started in jflow</span>}
      </div>
    </Link>
  );
}
