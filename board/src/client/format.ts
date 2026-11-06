export const num = new Intl.NumberFormat('en');
export const pct = new Intl.NumberFormat('en', { style: 'percent', maximumFractionDigits: 0 });
export const one = new Intl.NumberFormat('en', { maximumFractionDigits: 1 });
export const time = new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit' });
