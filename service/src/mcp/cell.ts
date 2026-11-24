export const cell = (v: string) => {
  if (/[|\r\n]/.test(v)) throw new Error('A value cannot hold "|" or a line break.');
  return v;
};
