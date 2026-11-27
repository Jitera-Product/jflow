import { Menu } from 'lucide-react';

type Props = { engineer: boolean };

const ITEM = 'block rounded-md px-3 py-2 hover:bg-accent';

export function AppMenu({ engineer }: Props) {
  return (
    <details className="relative">
      <summary aria-label="Menu" className="flex size-8 cursor-pointer list-none items-center justify-center rounded-full hover:bg-accent [&::-webkit-details-marker]:hidden">
        <Menu className="size-5" aria-hidden="true" />
      </summary>
      <ul className="bg-card absolute top-10 left-0 z-50 flex min-w-44 flex-col gap-0.5 rounded-lg border p-1 text-sm font-normal shadow-md">
        <li><a className={ITEM} href="/">Board</a></li>
        <li><a className={ITEM} href="/waiting">Waiting for me</a></li>
        <li><a className={ITEM} href="/people">People</a></li>
        <li><a className={ITEM} href="/me">Me</a></li>
        {engineer && <li><a className={ITEM} href="/settings">Settings</a></li>}
      </ul>
    </details>
  );
}
