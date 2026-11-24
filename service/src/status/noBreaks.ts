export function noBreaks(...values: string[]): string[] {
  if (values.some((v) => /[|\r\n]/.test(v))) throw new Error('A value cannot hold "|" or a line break.');
  return values;
}
