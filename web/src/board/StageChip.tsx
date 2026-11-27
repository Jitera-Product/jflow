import { cn } from '@/lib/cn';

export function StageChip({ stage, className }: { stage: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center rounded-full px-2 text-xs font-medium whitespace-nowrap',
        stage === 'Done' ? 'bg-success-bg text-success-text' : 'bg-secondary text-secondary-foreground',
        className,
      )}
    >
      {stage}
    </span>
  );
}
