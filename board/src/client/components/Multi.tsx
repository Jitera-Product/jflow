import type { Option } from '../types.js';

type Props = { label: string; all: string; options: Option[]; value: string[]; onChange: (v: string[]) => void };

export function Multi({ label, all, options, value, onChange }: Props) {
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
