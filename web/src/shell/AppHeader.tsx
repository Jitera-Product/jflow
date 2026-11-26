import { useEffect, useState } from 'react';
import { getMe } from '@/api/getMe';
import type { Me } from '@/api/types';
import { NewIdeaDialog } from '@/board/NewIdeaDialog';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

// Plain links: each page loads its own data, so a full page load costs nothing extra.
const LINKS = [
  { href: '/', label: 'Stages', here: (p: string) => p === '/' || p.startsWith('/f/') },
  { href: '/workload', label: 'Workload', here: (p: string) => p === '/workload' },
  { href: '/settings', label: 'Settings', here: (p: string) => p === '/settings', engineers: true },
];

export function AppHeader({ onIdeaCreated }: { onIdeaCreated?: () => void }) {
  const [me, setMe] = useState<Me | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    getMe().then(setMe, () => setMe(null));
  }, []);

  const path = location.pathname;
  return (
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
        <Button size="sm" className="ml-auto" disabled={!me?.teams.length} onClick={() => setAdding(true)}>
          New idea
        </Button>
      </nav>
      {adding && me && <NewIdeaDialog teams={me.teams} onClose={() => setAdding(false)} onCreated={onIdeaCreated} />}
    </header>
  );
}
