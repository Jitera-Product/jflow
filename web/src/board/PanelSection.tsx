import type { ReactNode } from 'react';

export function PanelSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 border-b px-7 py-6 last:border-b-0">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}
