// One page of a Boost read result, shaped like
//   `<path>#L<from>-L<to>` (Total lines: <total>, ID: <id>)
//   <jtr_block>
//   <body>
//   </jtr_block>
// Gives '' for an empty document, null for a missing file or a folder listing.
export function parseReadPage(text: string): { body: string; to: number; total: number } | '' | null {
  if (text.endsWith(' (empty document)') && !text.includes('<jtr_block>')) return '';
  const m = /^`.*#L(\d+)-L(\d+)` \(Total lines: (\d+)/.exec(text);
  const start = text.indexOf('<jtr_block>\n');
  const end = text.lastIndexOf('\n</jtr_block>');
  if (!m || start < 0 || end < start) return null; // missing file, or a folder listing
  return { body: text.slice(start + '<jtr_block>\n'.length, end), to: Number(m[2]), total: Number(m[3]) };
}
