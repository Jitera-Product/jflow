import './styles.css';
import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '@/api/ApiError';
import { getWorkload } from '@/api/getWorkload';
import { getWorkloadOptions } from '@/api/getWorkloadOptions';
import { PageShell } from '@/shell/PageShell';
import { num, pct, time } from './format';
import { initialFilters } from './initialFilters';
import { Kpi } from './Kpi';
import { WINDOWS } from './labels';
import { Multi } from './Multi';
import { NotOnBoard } from './NotOnBoard';
import { PersonCard } from './PersonCard';
import { rememberFilters } from './rememberFilters';
import type { BoardResponse, Filters, Options } from './types';

export function WorkloadPage() {
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
      setData(await getWorkload(filters, refresh));
    } catch (e) {
      setError(e instanceof ApiError ? e.message || e.error : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void load(false);
    rememberFilters(filters);
  }, [load, filters]);

  useEffect(() => {
    getWorkloadOptions().then(setOptions, () => setOptions({ teams: [], statuses: [] }));
  }, []);

  const s = data?.summary;
  return (
    <PageShell header className="max-w-none p-0">
      <div className="wb">
        <header className="wb-head">
          <div>
            <h1 className="wb-title">Team workload</h1>
            <p className="wb-lede">
              <b>{s ? num.format(s.offBoard) : '-'}</b> of <b>{s ? num.format(s.active) : '-'}</b> active issues of people on the chosen projects sit outside their own projects. <b>{s ? num.format(s.noProject) : '-'}</b> of them have no project at all.
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
            <button type="button" className="wb-btn" disabled={loading} onClick={() => void load(true)}>{loading ? 'Loading...' : 'Refresh data'}</button>
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
            The forecast is open issues (started and Todo) divided by the issues the person closed per week over the last {data?.settings.paceDays ?? 21} days. Issues finished by the agent do not count as their pace. Agent-ready issues carry agent:ready and one repo: label.
          </p>
          <div className="wb-grid">{data?.people.map((p) => <PersonCard key={p.person.id} p={p} paceDays={data.settings.paceDays} minClosures={data.settings.minClosures} />)}</div>
        </section>

        {data && <NotOnBoard rows={data.notOnBoard} />}
      </div>
    </PageShell>
  );
}
