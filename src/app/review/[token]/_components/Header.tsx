import Image from 'next/image';

export function Header() {
  return (
    <header className="text-center mb-6">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-panel border border-line mb-3">
        <Image src="/mochi-base-transparent.png" alt="Apalchi" width={32} height={32} className="object-contain" />
      </div>
      <h1 className="text-xl font-bold text-ink">Apalchi</h1>
      <p className="text-ink2 text-sm mt-2 leading-relaxed">
        A student asked you to check this study guide.
      </p>
    </header>
  );
}
