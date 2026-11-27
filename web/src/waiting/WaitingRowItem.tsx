import { daysText } from '@/lib/daysText';
import type { WaitingRow } from '@/board/waitingRowsOf';

export function WaitingRowItem({ row }: { row: WaitingRow }) {
  return (
    <li className="bg-card grid grid-cols-1 items-center gap-4 rounded-xl border px-4 py-3.5 shadow-sm md:grid-cols-[96px_minmax(0,1fr)_120px_auto]">
      <span className="text-muted-foreground font-mono text-xs">{row.card.id ?? ''}</span>
      <span className="min-w-0">
        <b className="font-semibold">{row.card.name}</b>
        <br />
        <span className="text-muted-foreground">{row.what}</span>
      </span>
      <span className="text-muted-foreground text-[13px]">{daysText(row.days)}</span>
      <a
        href={row.href}
        aria-label={`Open ${row.card.name}`}
        className="bg-primary text-primary-foreground inline-flex h-9 items-center justify-self-start rounded-full px-4 font-medium whitespace-nowrap hover:bg-primary/90"
      >
        Open
      </a>
    </li>
  );
}
