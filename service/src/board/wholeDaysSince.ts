export const wholeDaysSince = (from: string, now: Date): number =>
  Math.floor((now.getTime() - new Date(from).getTime()) / 86_400_000);
