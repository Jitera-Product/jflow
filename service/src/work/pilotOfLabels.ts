export function pilotOfLabels(labels: Array<{ name: string }>): string | null {
  for (const l of labels) {
    const m = /^pilot-(\d+)$/i.exec(l.name.trim());
    if (m) return `P${Number(m[1])}`;
  }
  return null;
}
