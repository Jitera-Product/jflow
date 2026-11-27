export const tdrTitleOf = (file: string): string =>
  file.replace(/\.md$/i, '').replace(/^TDR[-\s]+/i, '').replaceAll('-', ' ').trim();
