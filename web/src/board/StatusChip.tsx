import { cn } from '@/lib/cn';
import type { StatusChip as Chip } from './statusChipOf';

const CHIP = 'inline-flex h-6 items-center gap-1.5 rounded-full px-2 text-xs font-medium whitespace-nowrap';
const TONE = {
  person: ['bg-waits-bg text-waits-text', 'bg-waits-dot'],
  working: ['bg-working-bg text-working-text', 'bg-working-text'],
  agent: ['bg-secondary text-muted-foreground', 'bg-ring'],
};

export function StatusChip({ chip, className }: { chip: Chip; className?: string }) {
  if (chip.tone === 'done') return <span className={cn('text-muted-foreground text-xs', className)}>{chip.text}</span>;
  if (chip.tone === 'you') return <span className={cn(CHIP, 'bg-primary text-primary-foreground', className)}>{chip.text}</span>;
  const [box, dot] = TONE[chip.tone];
  return (
    <span className={cn(CHIP, box, className)}>
      <span aria-hidden="true" className={cn('size-1.5 flex-none rounded-full', dot)} />
      {chip.text}
    </span>
  );
}
