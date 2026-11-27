import type { FeaturePanelView } from '@/api/types';
import { cn } from '@/lib/cn';
import { shortDate } from '@/lib/shortDate';

const DOT: Record<string, string> = {
  done: 'bg-success-text',
  skipped: 'bg-border',
  'in progress': 'bg-primary ring-3 ring-border',
};

const noteOf = (s: FeaturePanelView['stages'][number]) =>
  s.status === 'done' ? ['done', s.by && `by ${s.by}`].filter(Boolean).join(' ') + (s.date ? `, ${shortDate(s.date)}` : '') : s.status;

export function StageTimeline({ stages }: { stages: FeaturePanelView['stages'] }) {
  return (
    <ol className="flex flex-col gap-0.5 text-[13px]">
      {stages.map((s) => {
        const active = s.status === 'in progress';
        const quiet = s.status === 'skipped' || s.status === 'not started';
        return (
          <li key={s.stage} className="flex min-h-8 items-center gap-2.5">
            <span aria-hidden="true" className={cn('size-1.5 flex-none rounded-full', DOT[s.status] ?? 'border-ring border bg-transparent')} />
            <span className={cn('w-28 flex-none', active && 'font-semibold', quiet && 'text-muted-foreground')}>{s.stage}</span>
            <span className={cn(!active && 'text-muted-foreground')}>{noteOf(s)}</span>
          </li>
        );
      })}
    </ol>
  );
}
