import type { BoardCard, Me, Reviews } from '@/api/types';
import { cardWaitingRow } from './cardWaitingRow';
import { prWaitingRow } from './prWaitingRow';
import { tdrWaitingRow } from './tdrWaitingRow';
import { WAITING_GROUPS } from './WAITING_GROUPS';

export type WaitingRow = {
  group: (typeof WAITING_GROUPS)[number];
  key: string; id: string; name: string; what: string; ref: string | null;
  days: number | null;
  link: { href: string; text: string; label: string; primary: boolean } | null;
};

const order = (r: WaitingRow) => WAITING_GROUPS.indexOf(r.group);

// at: when the board was read, so the days match the board
export function waitingRowsOf(cards: BoardCard[], me: Me, at: string, reviews: Reviews | null = null): WaitingRow[] {
  const rows = [
    ...cards.filter((c) => c.waitingForMe).map((c) => cardWaitingRow(c, me, at)),
    ...(reviews?.prs ?? []).map((pr) => prWaitingRow(pr, at)),
    ...(reviews?.tdrs ?? []).map(tdrWaitingRow),
  ];
  return rows.sort((a, b) => order(a) - order(b) || (b.days ?? -1) - (a.days ?? -1));
}
