import { wholeDays } from '@/lib/wholeDays';

export const gateDaysOf = (gate: { opened: string }, at: string): number => wholeDays(gate.opened, at);
