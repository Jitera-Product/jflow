export const commaList = (v: string | null | undefined): string[] => (v ?? '').split(',').filter(Boolean);
