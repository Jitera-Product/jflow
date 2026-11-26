import type { ReactNode } from 'react';
import { Card } from '@/components/ui/Card';

export function SettingsSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <Card id={id} role="region" aria-labelledby={`${id}-title`} className="scroll-mt-6 px-6">
      <h2 id={`${id}-title`} className="text-base leading-none font-semibold">
        {title}
      </h2>
      {children}
    </Card>
  );
}
