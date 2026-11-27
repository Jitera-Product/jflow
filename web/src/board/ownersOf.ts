import type { BoardCard } from '@/api/types';

export function ownersOf(cards: BoardCard[]): Array<{ name: string; email: string }> {
  const byEmail = new Map(cards.flatMap((c) => (c.owner ? [[c.owner.email, c.owner] as const] : [])));
  return [...byEmail.values()].sort((a, b) => a.name.localeCompare(b.name));
}
