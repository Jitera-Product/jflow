import { cn } from '@/lib/cn';
import type { StatusChip as Chip } from './statusChipOf';

const CHIP = 'inline-flex h-6 items-center gap-1.5 rounded-full px-2 text-xs font-medium whitespace-nowrap';

export function StatusChip({ chip, className }: { chip: Chip; className?: string }) {
  if (chip.tone === 'done') return <span className={cn('text-muted-foreground text-xs', className)}>{chip.text}</span>;
  if (chip.tone === 'you') return <span className={cn(CHIP, 'bg-primary text-primary-foreground', className)}>{chip.text}</span>;
  const person = chip.tone === 'person';
  return (
    <span className={cn(CHIP, person ? 'bg-waits-bg text-waits-text' : 'bg-secondary text-muted-foreground', className)}>
      <span aria-hidden="true" className={cn('size-1.5 flex-none rounded-full', person ? 'bg-waits-dot' : 'bg-ring')} />
      {chip.text}
    </span>
  );
}
