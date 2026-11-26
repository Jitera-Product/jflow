import type { ReactNode } from 'react';
import type { Me } from '@/api/types';
import { cn } from '@/lib/cn';
import { AppHeader } from './AppHeader';

type Props = { children: ReactNode; header?: boolean; me?: Me | null; onIdeaCreated?: () => void; className?: string };

export function PageShell({ children, header = false, me, onIdeaCreated, className }: Props) {
  return (
    <>
      {header && <AppHeader me={me} onIdeaCreated={onIdeaCreated} />}
      <main className={cn('mx-auto w-full max-w-xl px-4 py-12 text-sm', className)}>{children}</main>
    </>
  );
}
