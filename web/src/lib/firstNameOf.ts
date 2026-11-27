export function firstNameOf(email: string): string {
  const first = email.split('@')[0]!.split(/[._-]+/)[0] ?? '';
  return first.charAt(0).toUpperCase() + first.slice(1);
}
