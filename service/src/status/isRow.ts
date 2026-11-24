export const isRow = (l: string) => l.startsWith('| ') && !l.startsWith('| Gate |') && !l.startsWith('| ---');
