export const cellsOf = (line: string) => line.slice(1, -1).split('|').map((c) => c.trim());
