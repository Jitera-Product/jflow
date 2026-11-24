export function parseListing(text: string, path: string): string[] {
  const names: string[] = [];
  let section = '';
  for (const line of text.split('\n')) {
    if (/^\s*\.\.\. and \d+ more/.test(line) || /listing may be incomplete/i.test(line)) {
      throw new Error(`documents: list: listing of ${path} is incomplete`);
    }
    if (line === 'Subdirectories:' || line === 'Files:') section = line;
    else if (/^ {2}\S/.test(line) && section) {
      names.push(section === 'Files:' ? line.trim() : line.trim().replace(/ \(\d+ files\)$/, ''));
    }
  }
  return names;
}
