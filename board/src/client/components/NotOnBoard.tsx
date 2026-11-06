import type { Board } from '../../shared/model.js';
import { num } from '../format.js';

export function NotOnBoard({ rows }: { rows: Board['notOnBoard'] }) {
  if (!rows.length) return null;
  return (
    <section>
      <h2 className="wb-section-title">Not on the board</h2>
      <p className="wb-note">People with active issues who don't lead or join any project on the board.</p>
      <div className="wb-panel">
        <table className="wb-table">
          <thead><tr><th>Person</th><th className="num">Active issues</th><th className="num">No project</th></tr></thead>
          <tbody>{rows.map((r) => <tr key={r.person.id}><td>{r.person.name}</td><td className="num">{num.format(r.issues)}</td><td className="num">{num.format(r.noProject)}</td></tr>)}</tbody>
        </table>
      </div>
    </section>
  );
}
