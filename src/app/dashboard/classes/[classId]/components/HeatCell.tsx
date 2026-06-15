// Shared heatmap cell — used by both HeatmapTab and ConceptMasteryTab's quiz
// fallback. Pure presentational, no hooks.
export function HeatCell({ value }: { value: number | null }) {
  if (value === null) {
    return <div className="w-10 h-10 bg-panel2 rounded flex items-center justify-center text-xs text-ink3">—</div>;
  }
  const bg = value >= 0.7 ? 'bg-ok' : value >= 0.45 ? 'bg-warn' : 'bg-bad';
  return (
    <div
      className={`w-10 h-10 rounded flex items-center justify-center text-xs font-mono text-ink ${bg}`}
      style={{ opacity: 0.4 + value * 0.6 }}
      title={`${Math.round(value * 100)}%`}
    >
      {Math.round(value * 100)}
    </div>
  );
}
