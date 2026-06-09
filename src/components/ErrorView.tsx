'use client';

/**
 * Friendly error display with optional retry button.
 * Uses the existing theme tokens (bg-bad, text-bad, etc.).
 */
export default function ErrorView({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="bg-bad/10 border border-bad/30 rounded-xl px-5 py-4 text-sm">
      <p className="text-bad">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 text-xs font-semibold text-bad hover:text-bad/80 underline underline-offset-2 transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  );
}
