import { useCallback, useEffect, useState } from 'react';
import type { Board, Forecast, PersonCard } from '../shared/model.js';

type Options = { teams: Array<{ id: string; name: string }>; statuses: Array<{ id: string; name: string }> };
type BoardResponse = Board & { window: string; updatedAt: string };
const STORE = 'jflow-board-filters';
type Saved = { window?: string; team?: string[]; status?: string[] };
const saved = ((): Saved => {
  try {
    return JSON.parse(localStorage.getItem(STORE) ?? '{}') as Saved;
  } catch {
    return {};
  }
})();
const urlHasFilters = ['window', 'team', 'status'].some((k) => new URLSearchParams(location.search).has(k));
const listParam = (name: 'team' | 'status'): string[] =>
  urlHasFilters ? (new URLSearchParams(location.search).get(name) ?? '').split(',').filter(Boolean) : (saved[name] ?? []);

const WINDOWS = [
  { value: '-P14D', label: 'last 14 days' },
  { value: '-P30D', label: 'last 30 days' },
  { value: '-P90D', label: 'last 90 days' },
];
const KIND_LABEL = { off_board_project: 'Not on board', other_board_project: "Other's board project" } as const;
const AGENT_LABEL = { ready: 'Agent-ready', working: 'Agent working', review: 'PR ready for review', stuck: 'Stuck' } as const;

const num = new Intl.NumberFormat('en');
const pct = new Intl.NumberFormat('en', { style: 'percent', maximumFractionDigits: 0 });
const one = new Intl.NumberFormat('en', { maximumFractionDigits: 1 });
const time = new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit' });

export function App() {
  const [window, setWindow] = useState(() => (urlHasFilters ? new URLSearchParams(location.search).get('window') : saved.window) ?? '-P30D');
  const [teams, setTeams] = useState<string[]>(() => listParam('team'));
  const [statuses, setStatuses] = useState<string[]>(() => listParam('status'));
  const [options, setOptions] = useState<Options>({ teams: [], statuses: [] });
  const [data, setData] = useState<BoardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (refresh: boolean) => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({ window });
      if (teams.length) q.set('team', teams.join(','));
      if (statuses.length) q.set('status', statuses.join(','));
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
  }, [window, teams, statuses]);

  useEffect(() => {
    void load(false);
    const u = new URL(location.href);
    u.searchParams.set('window', window);
    for (const [k, v] of [['team', teams], ['status', statuses]] as const) {
      if (v.length) u.searchParams.set(k, v.join(','));
      else u.searchParams.delete(k);
    }
    history.replaceState(null, '', u);
    try {
      localStorage.setItem(STORE, JSON.stringify({ window, team: teams, status: statuses }));
    } catch {
      /* storage blocked: the link still keeps the choice */
    }
  }, [load, window, teams, statuses]);

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
          <Multi label="Team" all="All teams" options={options.teams} value={teams} onChange={setTeams} />
          <Multi label="Status" all="All open statuses" options={options.statuses} value={statuses} onChange={setStatuses} />
          <label>
            Issues updated in
            <select value={window} onChange={(e) => setWindow(e.target.value)}>
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
        <div className="wb-grid">{data?.people.map((p) => <Card key={p.person.id} p={p} paceDays={data.settings.paceDays} minClosures={data.settings.minClosures} />)}</div>
      </section>

      {data && data.notOnBoard.length > 0 && (
        <section>
          <h2 className="wb-section-title">Not on the board</h2>
          <p className="wb-note">People with active issues who don't lead or join any project on the board.</p>
          <div className="wb-panel">
            <table className="wb-table">
              <thead><tr><th>Person</th><th className="num">Active issues</th><th className="num">No project</th></tr></thead>
              <tbody>{data.notOnBoard.map((r) => <tr key={r.person.id}><td>{r.person.name}</td><td className="num">{num.format(r.issues)}</td><td className="num">{num.format(r.noProject)}</td></tr>)}</tbody>
            </table>
          </div>
        </section>
      )}
    </main>
  );
}

function Multi({ label, all, options, value, onChange }: { label: string; all: string; options: Array<{ id: string; name: string }>; value: string[]; onChange: (v: string[]) => void }) {
  const picked = options.filter((o) => value.includes(o.id));
  const summary = !value.length ? all : picked.length === 1 ? picked[0]?.name : `${value.length} selected`;
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  return (
    <details className="wb-multi">
      <summary>{label}: {summary}</summary>
      <div className="wb-multi-list">
        <button type="button" className="wb-btn" onClick={() => onChange([])}>{all}</button>
        {options.map((o) => (
          <label key={o.id}><input type="checkbox" checked={value.includes(o.id)} onChange={() => toggle(o.id)} />{o.name}</label>
        ))}
      </div>
    </details>
  );
}

function Kpi({ label, value }: { label: string; value: string | undefined | null }) {
  return (
    <div className="wb-kpi">
      <span className="wb-kpi-label">{label}</span>
      <span className="wb-kpi-value">{value ?? '—'}</span>
    </div>
  );
}

function ForecastBox({ f, paceDays, minClosures, ready }: { f: Forecast; paceDays: number; minClosures: number; ready: number }) {
  return (
    <div className="wb-forecast">
      {f.kind === 'cut' && <span className="wb-muted">Data cut at the page limit, no forecast</span>}
      {f.kind === 'few' && <span className="wb-muted">No forecast: fewer than {minClosures} closed issues in {paceDays} days</span>}
      {f.kind === 'ok' && (
        <>
          <span>Own work at current pace: <b>~{one.format(f.weeks)} weeks</b></span>
          <span className="wb-muted">{num.format(f.queue)} open issues, {one.format(f.perWeek)} closed per week</span>
        </>
      )}
      {ready > 0 && <span>{ready} {ready === 1 ? 'issue could' : 'issues could'} go to the agent</span>}
    </div>
  );
}

function Card({ p, paceDays, minClosures }: { p: PersonCard; paceDays: number; minClosures: number }) {
  const total = p.bar.own + p.bar.outside + p.bar.ready;
  const w = (n: number) => `${total ? (n / total) * 100 : 0}%`;
  return (
    <article className="wb-card">
      <div className="wb-card-head">
        <h3 className="wb-card-name">{p.person.name}</h3>
        <span className={`wb-count${p.outsideCount ? ' has' : ''}`}>{p.outsideCount} outside</span>
      </div>
      <div className="wb-bar">
        <span className="own" style={{ width: w(p.bar.own) }} />
        <span className="out" style={{ width: w(p.bar.outside) }} />
        <span className="ready" style={{ width: w(p.bar.ready) }} />
      </div>
      <div className="wb-muted">{num.format(p.bar.own)} in own projects · {num.format(p.bar.outside)} outside · {num.format(p.bar.ready)} agent-ready</div>
      <ForecastBox f={p.forecast} paceDays={paceDays} minClosures={minClosures} ready={p.bar.ready} />

      <div className="wb-sub">Own projects</div>
      {p.ownProjects.length === 0 ? <p className="wb-empty">No board projects.</p> : (
        <div className="wb-chips">
          {p.ownProjects.map((r) => (
            <a key={r.id} className="wb-chip" href={r.url} target="_blank" rel="noopener" title={r.status}>
              <span className={`wb-dot ${r.statusType}`} />
              <span className="wb-chip-text">{r.name}</span>
              {r.role === 'lead' && <span className="wb-muted">lead</span>}
              <span className="wb-muted">{r.count}</span>
            </a>
          ))}
        </div>
      )}

      {p.otherProjects.length > 0 && (
        <>
          <div className="wb-sub">Other projects</div>
          <div className="wb-chips">
            {p.otherProjects.map((r) => (
              <span key={r.name} className="wb-chip">
                <span className="wb-chip-text">{r.name}</span>
                <span className={`wb-tag ${r.kind}`}>{KIND_LABEL[r.kind]}</span>
                <span className="wb-muted">{r.count}</span>
              </span>
            ))}
          </div>
        </>
      )}

      {p.agent.length > 0 && (
        <>
          <div className="wb-sub">Agent</div>
          <ul className="wb-list">
            {p.agent.map(({ issue, state }) => (
              <li key={issue.id} className="wb-item">
                <a className="wb-id" href={issue.url} target="_blank" rel="noopener">{issue.id}</a>
                <a className="wb-item-title" href={issue.url} target="_blank" rel="noopener">{issue.title}</a>
                <div className="wb-item-meta"><span className={`wb-tag ${state}`}>{AGENT_LABEL[state]}</span><span>{issue.status}</span></div>
                {(state === 'ready' || state === 'stuck') && <Command text={`/flow:quick ${issue.id}`} />}
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="wb-sub">Without a project</div>
      {p.noProject.length === 0 ? <p className="wb-empty">Nothing here.</p> : (
        <ul className="wb-list">
          {p.noProject.map(({ issue, stuck }) => (
            <li key={issue.id} className="wb-item">
              <a className="wb-id" href={issue.url} target="_blank" rel="noopener">{issue.id}</a>
              <a className="wb-item-title" href={issue.url} target="_blank" rel="noopener">{issue.title}</a>
              <div className="wb-item-meta">{stuck && <span className="wb-tag stuck">Stuck</span>}<span>{issue.status}</span></div>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function Command({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="wb-cmd">
      <code>{text}</code>
      <button type="button" className="wb-btn" onClick={() => void navigator.clipboard.writeText(text).then(() => setCopied(true), () => setCopied(false))}>{copied ? 'Copied' : 'Copy'}</button>
    </div>
  );
}
