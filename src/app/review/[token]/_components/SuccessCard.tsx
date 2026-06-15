export function SuccessCard() {
  return (
    <div className="bg-panel rounded-2xl border border-line p-8 text-center">
      <span className="text-4xl">🎉</span>
      <h2 className="text-lg font-bold text-ink mt-3">
        Thanks — we&apos;ve let them know!
      </h2>
      <p className="text-ink2 text-sm mt-2 leading-relaxed">
        Your feedback has been sent to the student.
      </p>
      <p className="text-ink3 text-xs mt-6 leading-relaxed">
        Apalchi turns students&apos; own notes into study material — adult-checked.{' '}
        <a
          href="https://apalchi.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent font-semibold hover:underline whitespace-nowrap"
        >
          Learn more →
        </a>
      </p>
    </div>
  );
}
