import { useId } from 'react';
import { Button } from '@/components/ui/Button';

type Props = {
  teams: string[];
  team: string;
  mine: boolean;
  loading: boolean;
  onTeam: (team: string) => void;
  onMine: (mine: boolean) => void;
  onRefresh: () => void;
};

export function BoardFilters({ teams, team, mine, loading, onTeam, onMine, onRefresh }: Props) {
  const id = useId();
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex items-center gap-2">
        <label htmlFor={id} className="text-muted-foreground">Team</label>
        <select
          id={id}
          className="border-input dark:bg-input/30 h-8 rounded-md border bg-transparent px-2 shadow-xs outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          value={team}
          onChange={(e) => onTeam(e.target.value)}
        >
          <option value="">All teams</option>
          {teams.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
      <label className="flex items-center gap-2">
        <input type="checkbox" className="size-4 accent-primary" checked={mine} onChange={(e) => onMine(e.target.checked)} />
        Only waiting for me
      </label>
      <Button variant="outline" size="sm" loading={loading} onClick={onRefresh}>Refresh</Button>
    </div>
  );
}
