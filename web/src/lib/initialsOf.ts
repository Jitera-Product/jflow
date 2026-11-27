// "Mika Sato" or "mika.sato@x.com" -> "MS"
export function initialsOf(nameOrEmail: string): string {
  const parts = nameOrEmail.split('@')[0]!.split(/[\s._-]+/).filter(Boolean);
  return parts.slice(0, 2).map((p) => p[0]!.toUpperCase()).join('') || '?';
}
