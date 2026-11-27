import type { BoardCard } from '@/api/types';

export type CardFilter = { query: string; owner: string; stuck: boolean }; // owner: an email, '' = anyone

export function filterCards(cards: BoardCard[], f: CardFilter): BoardCard[] {
  const q = f.query.trim().toLowerCase();
  return cards.filter((c) =>
    (!q || c.name.toLowerCase().includes(q) || !!c.id?.toLowerCase().includes(q)) &&
    (!f.owner || c.owner?.email === f.owner) &&
    (!f.stuck || c.stuck));
}
