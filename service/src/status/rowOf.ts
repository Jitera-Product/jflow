export const rowOf = (cells: string[]) => `| ${cells.join(' | ')} |`.replace(/ {2,}\|/g, ' |');
