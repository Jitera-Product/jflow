import type { ReactNode } from 'react';

export function PageShell({ children }: { children: ReactNode }) {
  return <main className="mx-auto w-full max-w-xl px-4 py-12 text-sm">{children}</main>;
}
