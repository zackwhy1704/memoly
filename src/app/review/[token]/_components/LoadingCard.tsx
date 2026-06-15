export function LoadingCard() {
  return (
    <div className="bg-panel rounded-2xl border border-line p-8 flex flex-col items-center gap-3">
      <span className="text-3xl animate-bounce">🐾</span>
      <p className="text-ink3 text-sm">Loading the study guide…</p>
    </div>
  );
}
