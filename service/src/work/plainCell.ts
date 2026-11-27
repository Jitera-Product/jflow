export const plainCell = (cell: string) => cell.replace(/`/g, '').replace(/\\(.)/g, '$1').trim();
