const ID = /^[A-Za-z0-9-]{1,64}$/;

export const parseIds = (v: string | null): string[] | null => {
  const list = (v ?? '').split(',').filter(Boolean);
  return list.length <= 50 && list.every((x) => ID.test(x)) ? [...new Set(list)].sort() : null;
};
