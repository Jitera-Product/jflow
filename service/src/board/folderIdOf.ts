// a flow folder entry is "<ID> <name>/"
export const folderIdOf = (entry: string): string | null =>
  entry.endsWith('/') ? /^(\S+) /.exec(entry)?.[1] ?? null : null;
