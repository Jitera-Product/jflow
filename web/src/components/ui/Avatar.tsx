import { initialsOf } from '@/lib/initialsOf';
import { cn } from '@/lib/cn';

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('bg-border text-foreground inline-flex size-6 flex-none items-center justify-center rounded-full text-[10px] font-semibold', className)}
    >
      {initialsOf(name)}
    </span>
  );
}
