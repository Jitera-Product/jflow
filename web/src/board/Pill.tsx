import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type PillTone = 'pass' | 'fail' | 'waits' | 'working' | 'quiet' | 'outline';

const TONE: Record<PillTone, string> = {
  pass: 'bg-success-bg text-success-text',
  fail: 'bg-error-bg text-error-text',
  waits: 'bg-waits-bg text-waits-text',
  working: 'bg-working-bg text-working-text',
  quiet: 'bg-secondary text-secondary-foreground',
  outline: 'bg-card text-secondary-foreground border',
};

export function Pill({ tone, mono, className, children }: { tone: PillTone; mono?: boolean; className?: string; children: ReactNode }) {
  return (
    <span className={cn('inline-flex h-6 flex-none items-center gap-1.5 rounded-full px-2 text-xs font-medium whitespace-nowrap', TONE[tone], mono && 'font-mono', className)}>
      {children}
    </span>
  );
}
