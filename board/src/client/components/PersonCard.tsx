import type { PersonCard as Person } from '../../shared/model.js';
import { num } from '../format.js';
import { AGENT_LABEL, KIND_LABEL } from '../labels.js';
import { Command } from './Command.js';
import { ForecastBox } from './ForecastBox.js';

type Props = { p: Person; paceDays: number; minClosures: number };

export function PersonCard({ p, paceDays, minClosures }: Props) {
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
