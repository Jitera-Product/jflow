import { Outlet } from '@tanstack/react-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '@/api/ApiError';
import { getBoard } from '@/api/getBoard';
import { getMe } from '@/api/getMe';
import type { Me, StageBoard } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { when } from '@/lib/when';
import { AppHeader } from '@/shell/AppHeader';
import { savedTeam } from '@/shell/savedTeam';
import { saveTeam } from '@/shell/saveTeam';
import { StatePanel } from '@/shell/StatePanel';
import { BoardLegend } from './BoardLegend';
import { boardSummary } from './boardSummary';
import { BoardToolbar } from './BoardToolbar';
import { filterCards } from './filterCards';
import { ownersOf } from './ownersOf';
import { phaseColumnsOf } from './phaseColumnsOf';
import { PhaseColumn } from './PhaseColumn';

export function BoardPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [team, setTeam] = useState(savedTeam);
  const [mine, setMine] = useState(false);
  const [older, setOlder] = useState(false);
  const [query, setQuery] = useState('');
  const [owner, setOwner] = useState('');
  const [stuck, setStuck] = useState(false);
  const [board, setBoard] = useState<StageBoard | null>(null);
  const [failed, setFailed] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  // Only the last request may set the board, so a slow answer for old filters cannot win.
  const last = useRef(0);

  const load = useCallback(async (refresh: boolean) => {
    const n = ++last.current;
    setLoading(true);
    try {
      const b = await getBoard({ team, mine, older, refresh });
      if (n !== last.current) return;
      setBoard(b);
      setFailed(null);
    } catch (e) {
      if (n === last.current) setFailed(e);
    } finally {
      if (n === last.current) setLoading(false);
    }
  }, [team, mine, older]);

  useEffect(() => {
    void load(false);
  }, [load]);

  useEffect(() => {
    getMe().then(setMe, () => setMe(null));
  }, []);

  const all = board?.columns.flatMap((c) => c.cards) ?? [];
  const shown = (cards: typeof all) => filterCards(cards, { query, owner, stuck });
  return (
    <div className="bg-muted min-h-dvh">
      <AppHeader
        me={me}
        waiting={board ? all.filter((c) => c.waitingForMe).length : null}
        team={team}
        onTeam={(t) => {
          saveTeam(t);
          setTeam(t);
        }}
        search={query}
        onSearch={setQuery}
        onIdeaCreated={() => void load(true)}
      />
      <main className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 px-8 pt-6 pb-10 text-sm">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-[22px] leading-none font-semibold tracking-[-0.01em]">Features</h1>
          {board && <span className="text-muted-foreground">{boardSummary(all)}</span>}
          <span className="flex-[1_1_40px]" />
          <BoardToolbar owners={ownersOf(all)} owner={owner} stuck={stuck} mine={mine} onOwner={setOwner} onStuck={setStuck} onMine={setMine} />
        </div>
        {board?.notice && <p className="bg-secondary rounded-md px-3 py-2">{board.notice}</p>}
        {board && !all.length && <p className="text-muted-foreground">{mine ? 'Nothing waits for you.' : 'No features yet.'}</p>}
        {failed && board ? (
          <p role="alert" className="rounded-md border border-error-border bg-error-bg px-3 py-2 text-error-text">
            {(failed instanceof ApiError && failed.message) || 'Could not load the board. Try again.'}
          </p>
        ) : null}
        {failed && !board ? (
          <div className="max-w-xl">
            <StatePanel error={failed} />
          </div>
        ) : !board ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : (
          <>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] items-start gap-4">
              {phaseColumnsOf(board.columns).map((p) => (
                <PhaseColumn key={p.name} name={p.name} hint={p.hint} cards={shown(p.cards)} at={board.at}>
                  {p.name === 'Ship' && (
                    <Button variant="ghost" size="xs" className="text-muted-foreground self-start" onClick={() => setOlder(!older)}>
                      {older ? 'Hide older' : 'Show older'}
                    </Button>
                  )}
                </PhaseColumn>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <BoardLegend />
              <span className="text-muted-foreground flex items-center gap-2 text-xs">
                {`Data as of ${when.format(new Date(board.at))}`}
                <Button variant="ghost" size="xs" loading={loading} onClick={() => void load(true)}>Refresh</Button>
              </span>
            </div>
          </>
        )}
      </main>
      <Outlet />
    </div>
  );
}
