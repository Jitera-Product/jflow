import { Circle, CircleCheck } from 'lucide-react';
import type { SetupView } from '@/api/types';

export function Checklist({ setup }: { setup: SetupView | null }) {
  const items = [
    { id: 'linear', title: 'Linear', ok: setup?.linear.ok, message: setup?.linear.message },
    { id: 'github', title: 'GitHub (optional)', ok: setup?.github.ok, message: setup?.github.message },
    { id: 'jitera', title: 'Jitera', ok: setup?.jitera.ok, message: setup?.jitera.message },
    { id: 'chats', title: 'Chats', ok: setup?.chats.ok, message: 'Connect a chat and use it once.' },
  ];
  return (
    <ul aria-label="Setup" className="grid gap-2">
      {items.map((item) => (
        <li key={item.id}>
          <a href={`#${item.id}`} className="flex items-start gap-2 rounded-md hover:underline">
            {item.ok ? <CircleCheck className="mt-0.5 size-4 shrink-0 text-success-text-on-surface" /> : <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />}
            <span className="grid gap-0.5">
              <span className="font-medium">
                {item.title}
                <span className="sr-only">{item.ok ? ' Done' : ' Not done'}</span>
              </span>
              {!item.ok && <span className="text-muted-foreground">{setup ? item.message : 'Checking...'}</span>}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
