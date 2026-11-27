import { daysText } from '@/lib/daysText';

export function waitingSummary(days: number[]): string {
  const n = days.length;
  return `${n} ${n === 1 ? 'thing' : 'things'}. The oldest has waited ${daysText(Math.max(...days))}.`;
}
