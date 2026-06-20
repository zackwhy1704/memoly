export function LoadingCard() {
  return (
    <div className="bg-panel rounded-2xl border border-line p-8 flex flex-col items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/mochi-base-transparent.png" alt="Loading…" className="w-9 h-9 object-contain animate-bounce" />
      <p className="text-ink3 text-sm">Loading the study guide…</p>
    </div>
  );
}
