const ITEMS = [
  { dot: 'bg-waits-dot', text: 'Waits for a person' },
  { dot: 'bg-ring', text: 'Agent' },
  { dot: 'bg-error-text', text: 'Stuck' },
];

export function BoardLegend() {
  return (
    <div className="text-muted-foreground flex flex-wrap gap-4 text-xs">
      {ITEMS.map((i) => (
        <span key={i.text} className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className={`${i.dot} size-1.5 rounded-full`} />
          {i.text}
        </span>
      ))}
      <span>Bar: how far the feature is, from Intent to Done</span>
    </div>
  );
}
