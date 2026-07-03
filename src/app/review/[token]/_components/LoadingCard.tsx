import Image from 'next/image';

export function LoadingCard() {
  return (
    <div className="bg-panel rounded-2xl border border-line p-8 flex flex-col items-center gap-3">
      <Image src="/mochi-base-transparent.png" alt="Loading…" width={36} height={36} className="object-contain animate-bounce" />
      <p className="text-ink3 text-sm">Loading the study guide…</p>
    </div>
  );
}
