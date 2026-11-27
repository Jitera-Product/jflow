import type { BoardCard, Me } from '@/api/types';
import { plural } from '@/lib/plural';
import { gateDaysOf } from './gateDaysOf';
import { myActionOf } from './myActionOf';
import { qaFailedOf } from './qaFailedOf';
import { stageOfLabel } from './stageOfLabel';
import type { WaitingRow } from './waitingRowsOf';

const upper = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function cardWaitingRow(c: BoardCard, me: Me, at: string): WaitingRow {
  const g = c.openGate;
  const failed = qaFailedOf(c);
  const what = failed ? `QA: ${plural(failed, 'check')} failed. Fix it or accept it.` : upper(myActionOf(c));
  const row = { key: c.key, id: c.id ?? '', name: c.name, ref: null };
  const open = (href: string) => ({ href, text: 'Open', label: `Open ${c.name}`, primary: true });
  if (!g || !c.id) return { ...row, group: 'Decide', what, days: c.days, link: open(`/f/${c.key}`) };
  const mine = g.missing.filter((r) => (r === 'owner' ? c.owner?.email.toLowerCase() === me.email.toLowerCase() : me.engineer));
  return {
    ...row, group: 'Approve', days: gateDaysOf(g, at), link: open(`/gate/${c.id}/${g.id}`),
    what: `${what}: ${stageOfLabel(g.from)} -> ${stageOfLabel(g.to)}, as ${(mine.length ? mine : g.missing).join(' and ')}`,
  };
}
