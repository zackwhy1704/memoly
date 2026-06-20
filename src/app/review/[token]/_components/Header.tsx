export function Header() {
  return (
    <header className="text-center mb-6">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-panel border border-line mb-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/mochi-base-transparent.png" alt="Apalchi" className="w-8 h-8 object-contain" />
      </div>
      <h1 className="text-xl font-bold text-ink">Apalchi</h1>
      <p className="text-ink2 text-sm mt-2 leading-relaxed">
        A student asked you to check this study guide.
      </p>
    </header>
  );
}
