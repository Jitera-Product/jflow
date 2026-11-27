import type { ReactNode } from 'react';
import type { BoardCard } from '@/api/types';
import { FeatureCard } from './FeatureCard';

type Props = { name: string; hint: string; cards: BoardCard[]; at: string; children?: ReactNode };

export function PhaseColumn({ name, hint, cards, at, children }: Props) {
  return (
    <section aria-label={name} className="bg-secondary flex flex-col gap-2.5 rounded-[12px] p-3">
      <h2 className="flex items-baseline gap-2 px-1 py-0.5">
        <span className="font-semibold">{name}</span>
        <span className="text-muted-foreground text-xs font-normal">{hint}</span>
        <span className="text-muted-foreground ml-auto font-mono font-normal">{cards.length}</span>
      </h2>
      {cards.map((c) => <FeatureCard key={c.key} card={c} at={at} />)}
      {children}
    </section>
  );
}
