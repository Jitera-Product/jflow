type Props = { label: string; value: string | undefined | null };

export function Kpi({ label, value }: Props) {
  return (
    <div className="wb-kpi">
      <span className="wb-kpi-label">{label}</span>
      <span className="wb-kpi-value">{value ?? '—'}</span>
    </div>
  );
}
