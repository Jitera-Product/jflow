import { useEffect, useRef, useState } from 'react';
import { getMe } from '@/api/getMe';
import type { Me } from '@/api/types';
import { NewIdeaDialog } from '@/board/NewIdeaDialog';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { ThemeToggle } from './ThemeToggle';

// Plain links: each page loads its own data, so a full page load costs nothing extra.
const LINKS = [
  { href: '/', label: 'Stages', here: (p: string) => p === '/' || p.startsWith('/f/') },
  { href: '/workload', label: 'Workload', here: (p: string) => p === '/workload' },
  { href: '/settings', label: 'Settings', here: (p: string) => p === '/settings', engineers: true },
];

// me: undefined = the header asks /api/me itself; null = the page is still asking for it.
type Props = { me?: Me | null; onIdeaCreated?: () => void };

export function AppHeader({ me: given, onIdeaCreated }: Props) {
  const [fetched, setFetched] = useState<Me | null>(null);
  const [adding, setAdding] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const asks = given === undefined;
  const me = asks ? fetched : given;

  useEffect(() => {
    if (asks) getMe().then(setFetched, () => setFetched(null));
  }, [asks]);

  const path = location.pathname;
  return (
    <>
      <header className="border-b bg-background">
        <nav className="flex h-12 items-center gap-1 px-4 text-sm">
          <span className="mr-3 font-semibold">jflow</span>
          {LINKS.filter((l) => !l.engineers || me?.engineer).map((l) => (
            <a
              key={l.href}
              href={l.href}
              aria-current={l.here(path) ? 'page' : undefined}
              className={cn('rounded-md px-2 py-1 text-muted-foreground hover:bg-accent hover:text-foreground', l.here(path) && 'text-foreground font-medium')}
            >
              {l.label}
            </a>
          ))}
          <span className="ml-auto" />
          <ThemeToggle />
          <Button ref={button} size="sm" disabled={!me?.teams.length} onClick={() => setAdding(true)}>
            New idea
          </Button>
        </nav>
      </header>
      {adding && me && (
        <NewIdeaDialog
          teams={me.teams}
          onCreated={onIdeaCreated}
          onClose={() => {
            setAdding(false);
            button.current?.focus();
          }}
        />
      )}
    </>
  );
}
