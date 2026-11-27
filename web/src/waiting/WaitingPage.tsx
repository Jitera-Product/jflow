import { useEffect, useState } from 'react';
import { getBoard } from '@/api/getBoard';
import { getMe } from '@/api/getMe';
import { getReviews } from '@/api/getReviews';
import type { Me, Reviews, StageBoard } from '@/api/types';
import { WAITING_GROUPS } from '@/board/WAITING_GROUPS';
import { waitingRowsOf } from '@/board/waitingRowsOf';
import { firstNameOf } from '@/lib/firstNameOf';
import { AppHeader } from '@/shell/AppHeader';
import { savedTeam } from '@/shell/savedTeam';
import { saveTeam } from '@/shell/saveTeam';
import { StatePanel } from '@/shell/StatePanel';
import { ReviewsGithubNote } from './ReviewsGithubNote';
import { WaitingRowItem } from './WaitingRowItem';
import { waitingSummary } from './waitingSummary';

export function WaitingPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [team, setTeam] = useState(savedTeam);
  const [board, setBoard] = useState<StageBoard | null>(null);
  const [failed, setFailed] = useState<unknown>(null);
  const [reviews, setReviews] = useState<Reviews | null>(null);
  const loadReviews = () => getReviews().then(setReviews, () => setReviews(null));

  useEffect(() => {
    getMe().then(setMe, () => setMe(null));
    void loadReviews();
  }, []);

  useEffect(() => {
    let live = true;
    getBoard({ team, mine: true, older: false, refresh: false }).then(
      (b) => live && (setBoard(b), setFailed(null)),
      (e) => live && setFailed(e),
    );
    return () => {
      live = false;
    };
  }, [team]);

  const rows = board && me ? waitingRowsOf(board.columns.flatMap((c) => c.cards), me, board.at, reviews) : null;
  return (
    <div className="bg-muted min-h-dvh">
      <AppHeader
        me={me}
        waiting={rows ? rows.length : null}
        team={team}
        onTeam={(t) => {
          saveTeam(t);
          setTeam(t);
        }}
      />
      <main className="mx-auto flex w-full max-w-[1040px] flex-col gap-7 px-8 pt-8 pb-12 text-sm">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl leading-tight font-semibold tracking-[-0.01em]">{me ? `Waiting for you, ${firstNameOf(me.email)}` : 'Waiting for you'}</h1>
          {rows && rows.length > 0 && <span className="text-muted-foreground">{waitingSummary(rows.map((r) => r.days))}</span>}
        </div>
        {failed ? (
          <div className="max-w-xl"><StatePanel error={failed} /></div>
        ) : !rows ? (
          <p className="text-muted-foreground">Loading...</p>
        ) : !rows.length ? (
          <p className="text-muted-foreground rounded-xl border border-dashed p-4">Nothing waits for you.</p>
        ) : (
          WAITING_GROUPS.map((g) => {
            const mine = rows.filter((r) => r.group === g);
            return mine.length ? (
              <section key={g} aria-label={g} className="flex flex-col gap-2.5">
                <h2 className="text-sm font-semibold">{g}</h2>
                <ul className="flex flex-col gap-2.5">{mine.map((r) => <WaitingRowItem key={r.key} row={r} />)}</ul>
              </section>
            ) : null;
          })
        )}
        {reviews && <ReviewsGithubNote github={reviews.github} onConnected={() => void loadReviews()} />}
      </main>
    </div>
  );
}
