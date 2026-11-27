import { Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { getBoard } from '@/api/getBoard';
import { getMe } from '@/api/getMe';
import { getReviews } from '@/api/getReviews';
import type { Me } from '@/api/types';
import { NewIdeaDialog } from '@/board/NewIdeaDialog';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';
import { AppMenu } from './AppMenu';
import { savedTeam } from './savedTeam';
import { ThemeToggle } from './ThemeToggle';

// Plain links: each page loads its own data, so a full page load costs nothing extra.
const TABS = [
  { href: '/', label: 'Board', here: (p: string) => p === '/' || p.startsWith('/f/') },
  { href: '/waiting', label: 'Waiting for me', here: (p: string) => p === '/waiting' },
  { href: '/people', label: 'People', here: (p: string) => p === '/people' },
];

// me, waiting: undefined = the header asks itself; null = the page is still loading it.
type Props = {
  me?: Me | null;
  waiting?: number | null;
  team?: string;
  onTeam?: (team: string) => void;
  search?: string;
  onSearch?: (query: string) => void;
  onIdeaCreated?: () => void;
};

export function AppHeader({ me: givenMe, waiting: givenWaiting, team = savedTeam(), onTeam, search, onSearch, onIdeaCreated }: Props) {
  const [fetchedMe, setFetchedMe] = useState<Me | null>(null);
  const [fetchedWaiting, setFetchedWaiting] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const asksMe = givenMe === undefined;
  const asksWaiting = givenWaiting === undefined;
  const me = asksMe ? fetchedMe : givenMe;
  const waiting = asksWaiting ? fetchedWaiting : givenWaiting;

  useEffect(() => {
    if (asksMe) getMe().then(setFetchedMe, () => setFetchedMe(null));
  }, [asksMe]);

  useEffect(() => {
    if (!asksWaiting) return;
    Promise.all([getBoard({ team: savedTeam(), mine: true, older: false, refresh: false }), getReviews().catch(() => null)]).then(
      ([b, r]) => setFetchedWaiting(b.columns.flatMap((c) => c.cards).length + (r ? r.prs.length + r.tdrs.length : 0)),
      () => setFetchedWaiting(null),
    );
  }, [asksWaiting]);

  const path = location.pathname;
  return (
    <>
      <header className="bg-background border-b">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-6 px-8 py-3 text-sm">
          <div className="flex items-center gap-2.5 text-[15px] font-semibold">
            <AppMenu engineer={!!me?.engineer} />
            <span>jflow</span>
            {onTeam ? (
              <select
                aria-label="Team"
                className="text-muted-foreground hover:text-foreground cursor-pointer appearance-none rounded-md bg-transparent px-1 font-normal outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                value={team}
                onChange={(e) => onTeam(e.target.value)}
              >
                <option value="">All teams</option>
                {(me?.teams ?? []).map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            ) : (
              <span className="text-muted-foreground font-normal">{team || 'All teams'}</span>
            )}
          </div>
          <nav aria-label="Main" className="flex flex-wrap gap-1">
            {TABS.map((t) => (
              <a
                key={t.href}
                href={t.href}
                aria-current={t.here(path) ? 'page' : undefined}
                className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-muted-foreground hover:text-foreground', t.here(path) && 'bg-secondary text-foreground font-medium')}
              >
                {t.label}
                {t.href === '/waiting' && !!waiting && (
                  <span aria-label={`${waiting} waiting`} className="bg-primary text-primary-foreground inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-medium tabular-nums">
                    {waiting}
                  </span>
                )}
              </a>
            ))}
          </nav>
          <span className="flex-[1_1_200px]" />
          {onSearch && (
            <input
              type="search"
              aria-label="Search features"
              placeholder="Search features"
              className="bg-background h-9 w-60 max-w-full rounded-lg border px-3 outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              value={search ?? ''}
              onChange={(e) => onSearch(e.target.value)}
            />
          )}
          <Button ref={button} disabled={!me?.teams.length} onClick={() => setAdding(true)}>
            <Plus aria-hidden="true" />
            New idea
          </Button>
          <ThemeToggle />
          {me && (
            <a href="/me" title={me.email} aria-current={path === '/me' ? 'page' : undefined} className="rounded-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
              <span role="img" aria-label={me.email}><Avatar name={me.email} className="size-8 text-xs" /></span>
            </a>
          )}
        </div>
      </header>
      {adding && me && (
        <NewIdeaDialog
          teams={me.teams}
          requester={me.email}
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
