import type { BoardCard, Me } from '@/api/types';
import { gateDaysOf } from './gateDaysOf';
import { myActionOf } from './myActionOf';
import { stageOfLabel } from './stageOfLabel';

export type WaitingRow = { group: 'Approve' | 'Decide'; card: BoardCard; what: string; days: number; href: string };

const upper = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// at: when the board was read, so the days match the board
export function waitingRowsOf(cards: BoardCard[], me: Me, at: string): WaitingRow[] {
  const rows = cards.filter((c) => c.waitingForMe).map((c): WaitingRow => {
    const g = c.openGate;
    const what = upper(myActionOf(c));
    if (!g || !c.id) return { group: 'Decide', card: c, what, days: c.days, href: `/f/${c.key}` };
    const mine = g.missing.filter((r) => (r === 'owner' ? c.owner?.email.toLowerCase() === me.email.toLowerCase() : me.engineer));
    return {
      group: 'Approve', card: c, days: gateDaysOf(g, at), href: `/gate/${c.id}/${g.id}`,
      what: `${what}: ${stageOfLabel(g.from)} -> ${stageOfLabel(g.to)}, as ${(mine.length ? mine : g.missing).join(' and ')}`,
    };
  });
  return rows.sort((a, b) => (a.group === b.group ? b.days - a.days : a.group === 'Approve' ? -1 : 1));
}
