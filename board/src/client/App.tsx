import { useCallback, useEffect, useState } from 'react';
import { Kpi } from './components/Kpi.js';
import { Multi } from './components/Multi.js';
import { NotOnBoard } from './components/NotOnBoard.js';
import { PersonCard } from './components/PersonCard.js';
import { initialFilters, rememberFilters } from './filters.js';
import { num, pct, time } from './format.js';
import { WINDOWS } from './labels.js';
import type { BoardResponse, Filters, Options } from './types.js';

export function App() {
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [options, setOptions] = useState<Options>({ teams: [], statuses: [] });
  const [data, setData] = useState<BoardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const set = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }));

  const load = useCallback(async (refresh: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({ window: filters.window });
      if (filters.teams.length) q.set('team', filters.teams.join(','));
      if (filters.statuses.length) q.set('status', filters.statuses.join(','));
      if (refresh) q.set('refresh', '1');
      const res = await fetch(`/api/board?${q}`);
      const body = (await res.json()) as BoardResponse | { error: string };
      if (!res.ok || 'error' in body) throw new Error('error' in body ? body.error : `HTTP ${res.status}`);
      setData(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void load(false);
    rememberFilters(filters);
  }, [load, filters]);

  useEffect(() => {
    fetch('/api/options')
      .then((r) => (r.ok ? (r.json() as Promise<Options>) : { teams: [], statuses: [] }))
      .then(setOptions, () => setOptions({ teams: [], statuses: [] }));
  }, []);

  const s = data?.summary;
  return (
    <main className="wb">
      <header className="wb-head">
        <div>
          <h1 className="wb-title">Team workload</h1>
          <p className="wb-lede">
            <b>{s ? num.format(s.offBoard) : '—'}</b> of <b>{s ? num.format(s.active) : '—'}</b> active issues of people on the chosen projects sit outside their own projects. <b>{s ? num.format(s.noProject) : '—'}</b> of them have no project at all.
          </p>
        </div>
        <div className="wb-controls">
          <Multi label="Team" all="All teams" options={options.teams} value={filters.teams} onChange={(teams) => set({ teams })} />
          <Multi label="Status" all="All open statuses" options={options.statuses} value={filters.statuses} onChange={(statuses) => set({ statuses })} />
          <label>
            Issues updated in
            <select value={filters.window} onChange={(e) => set({ window: e.target.value })}>
              {WINDOWS.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
            </select>
          </label>
          <button type="button" className="wb-btn" disabled={loading} onClick={() => void load(true)}>{loading ? 'Loading…' : 'Refresh data'}</button>
          {data && <span className="wb-muted">Data as of {time.format(new Date(data.updatedAt))}</span>}
        </div>
      </header>

      {error && <p className="wb-error">Failed to load: {error}</p>}

      <section className="wb-kpis">
        <Kpi label="People on the board" value={s && num.format(s.people)} />
        <Kpi label="Active issues" value={s && num.format(s.active)} />
        <Kpi label="Outside own board projects" value={s && num.format(s.offBoard)} />
        <Kpi label="Share outside" value={s && pct.format(s.share)} />
        <Kpi label="Agent-ready (outside)" value={s && num.format(s.agentReady)} />
        <Kpi label="Agent PRs waiting review" value={s && num.format(s.agentReview)} />
      </section>

      <section>
        <h2 className="wb-section-title">By person</h2>
        <p className="wb-note">
          Projects on the board are the ones matching Team and Status above (no choice: all open projects of all teams). Each card shows projects, not their issues: the person's own projects (lead or member) and other projects where they have active issues, each with a count. Only issues without a project are listed one by one. The forecast is open issues (started and Todo) divided by the issues the person closed per week over the last {data?.settings.paceDays ?? 21} days; issues finished by the agent do not count as their pace. Agent-ready issues carry agent:ready and one repo: label.
        </p>
        <div className="wb-grid">{data?.people.map((p) => <PersonCard key={p.person.id} p={p} paceDays={data.settings.paceDays} minClosures={data.settings.minClosures} />)}</div>
      </section>

      {data && <NotOnBoard rows={data.notOnBoard} />}
    </main>
  );
}
