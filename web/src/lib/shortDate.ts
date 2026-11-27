const format = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });

// "2026-11-18" or an ISO time -> "Nov 18"
export const shortDate = (date: string): string => {
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? date : format.format(d);
};
