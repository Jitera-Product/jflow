import { cn } from '@/lib/cn';
import { daysText } from '@/lib/daysText';
import type { WaitingRow } from '@/board/waitingRowsOf';

export function WaitingRowItem({ row }: { row: WaitingRow }) {
  const { link } = row;
  return (
    <li className="bg-card grid grid-cols-1 items-center gap-4 rounded-xl border px-4 py-3.5 shadow-sm md:grid-cols-[96px_minmax(0,1fr)_120px_auto]">
      <span className="text-muted-foreground font-mono text-xs break-all">{row.id}</span>
      <span className="min-w-0">
        <b className="font-semibold">{row.name}</b>
        <br />
        <span className="text-muted-foreground">
          {row.what}
          {row.ref && <> <span className="font-mono text-xs">{row.ref}</span></>}
        </span>
      </span>
      <span className="text-muted-foreground text-[13px]">{row.days === null ? '' : daysText(row.days)}</span>
      {link ? (
        <a
          href={link.href}
          aria-label={link.label}
          {...(/^https?:/.test(link.href) && { target: '_blank', rel: 'noopener noreferrer' })}
          className={cn(
            'inline-flex h-9 items-center justify-self-start rounded-full px-4 font-medium whitespace-nowrap',
            link.primary ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-background border hover:bg-accent',
          )}
        >
          {link.text}
        </a>
      ) : (
        <span />
      )}
    </li>
  );
}
