import { daysText } from '@/lib/daysText';

export function waitingSummary(days: Array<number | null>): string {
  const n = days.length;
  const known = days.filter((d): d is number => d !== null);
  const things = `${n} ${n === 1 ? 'thing' : 'things'}.`;
  return known.length ? `${things} The oldest has waited ${daysText(Math.max(...known))}.` : things;
}
