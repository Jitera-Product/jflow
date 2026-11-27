import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { AppHeader } from './AppHeader';

type Props = { children: ReactNode; header?: boolean; className?: string };

export function PageShell({ children, header = false, className }: Props) {
  return (
    <>
      {header && <AppHeader />}
      <main className={cn('mx-auto w-full max-w-xl px-4 py-12 text-sm', className)}>{children}</main>
    </>
  );
}
