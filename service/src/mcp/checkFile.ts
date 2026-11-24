export function checkFile(file: string): string {
  if (!file || file.startsWith('/') || file.includes('\\') || file.split('/').includes('..')) {
    throw new Error(`${file || '(empty)'} is not a path inside the feature folder.`);
  }
  return file;
}
