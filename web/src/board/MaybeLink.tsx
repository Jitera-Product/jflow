import type { ReactNode } from 'react';

export function MaybeLink({ href, className, children }: { href: string | null; className?: string; children: ReactNode }) {
  if (!href) return <span className={className}>{children}</span>;
  return <a href={href} target="_blank" rel="noopener noreferrer" className={`${className ?? ''} underline-offset-2 hover:underline`}>{children}</a>;
}
