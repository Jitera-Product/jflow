import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

type Props = {
  owners: Array<{ name: string; email: string }>;
  owner: string;
  stuck: boolean;
  mine: boolean;
  onOwner: (email: string) => void;
  onStuck: (stuck: boolean) => void;
  onMine: (mine: boolean) => void;
};

const PILL = 'bg-card inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border px-3 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50';
const PRESSED = 'bg-primary text-primary-foreground border-primary';

export function BoardToolbar({ owners, owner, stuck, mine, onOwner, onStuck, onMine }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="relative inline-flex">
        <select aria-label="Owner" className={cn(PILL, 'appearance-none pr-7')} value={owner} onChange={(e) => onOwner(e.target.value)}>
          <option value="">Owner: Anyone</option>
          {owners.map((o) => <option key={o.email} value={o.email}>{`Owner: ${o.name}`}</option>)}
        </select>
        <ChevronDown aria-hidden="true" className="text-muted-foreground pointer-events-none absolute top-2.5 right-2.5 size-3" />
      </span>
      <button type="button" aria-pressed={stuck} className={cn(PILL, stuck && PRESSED)} onClick={() => onStuck(!stuck)}>
        <span aria-hidden="true" className="bg-error-text size-1.5 rounded-full" />
        Only stuck
      </button>
      <button type="button" aria-pressed={mine} className={cn(PILL, mine && PRESSED)} onClick={() => onMine(!mine)}>
        Waiting for me
      </button>
    </div>
  );
}
