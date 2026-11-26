import type { ReactNode } from 'react';
import type { BoardCard } from '@/api/types';
import { cn } from '@/lib/cn';
import { FeatureCard } from './FeatureCard';

export function StageColumn({ stage, cards, children }: { stage: string; cards: BoardCard[]; children?: ReactNode }) {
  return (
    <section aria-label={stage} className={cn('flex shrink-0 flex-col gap-2 rounded-xl bg-muted p-2', cards.length ? 'w-64' : 'w-28')}>
      <h2 className="flex items-baseline justify-between gap-2 px-1 font-medium">
        <span className="truncate">{stage}</span>
        <span className="text-muted-foreground text-xs tabular-nums">{cards.length}</span>
      </h2>
      {cards.map((c) => <FeatureCard key={c.key} card={c} />)}
      {children}
    </section>
  );
}
