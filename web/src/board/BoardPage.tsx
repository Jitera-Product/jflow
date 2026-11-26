import { Outlet } from '@tanstack/react-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '@/api/ApiError';
import { getBoard } from '@/api/getBoard';
import { getMe } from '@/api/getMe';
import type { Me, StageBoard } from '@/api/types';
import { Button } from '@/components/ui/Button';
import { when } from '@/lib/when';
import { PageShell } from '@/shell/PageShell';
import { StatePanel } from '@/shell/StatePanel';
import { BoardFilters } from './BoardFilters';
import { StageColumn } from './StageColumn';

export function BoardPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [team, setTeam] = useState('');
  const [mine, setMine] = useState(false);
  const [older, setOlder] = useState(false);
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

  return (
    <PageShell header me={me} onIdeaCreated={() => void load(true)} className="max-w-none py-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-baseline gap-3">
            <h1 className="text-lg leading-none font-semibold">Stages</h1>
            {board && board.stuck > 0 && <span className="text-error-text">{`${board.stuck} stuck`}</span>}
            {board && <span className="text-muted-foreground text-xs">{`Data as of ${when.format(new Date(board.at))}`}</span>}
          </div>
          <BoardFilters teams={me?.teams ?? []} team={team} mine={mine} loading={loading} onTeam={setTeam} onMine={setMine} onRefresh={() => void load(true)} />
        </div>
        {board?.notice && <p className="rounded-md bg-secondary px-3 py-2">{board.notice}</p>}
        {board && board.columns.every((c) => !c.cards.length) && (
          <p className="text-muted-foreground">{mine ? 'Nothing waits for you.' : 'No features yet.'}</p>
        )}
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
          <div className="-mx-4 flex items-start gap-3 overflow-x-auto px-4 pb-4">
            {board.columns.map((c) => (
              <StageColumn key={c.stage} stage={c.stage} cards={c.cards}>
                {c.stage === 'Done' && (
                  <Button variant="ghost" size="xs" className="self-start" onClick={() => setOlder(!older)}>
                    {older ? 'Hide older' : 'Show older'}
                  </Button>
                )}
              </StageColumn>
            ))}
          </div>
        )}
      </div>
      <Outlet />
    </PageShell>
  );
}
