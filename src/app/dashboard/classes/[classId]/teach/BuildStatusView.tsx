'use client';

import Image from 'next/image';

// Honest render of the REAL compile pipeline state. The cardinal rule (see prompt):
// never a stepper that lies. Numbers show ONLY when the backend actually reports
// them (pagesTotal from compileStatus); otherwise the progress is indeterminate.
// 'checking' is shown whenever readiness can't yet be determined — never a false 'Ready'.

export type BuildPhase = 'checking' | 'compiling' | 'ready' | 'timeout';

export interface BuildStatus {
  phase: BuildPhase;
  /** Real values from GET /wiki/compile/status — absent until the job reports them. */
  pagesCompiled?: number;
  pagesTotal?: number;
  /** wikiPageCount when the brain is READY. */
  lessonCount?: number;
  /** Number of pages the OCR/compile flagged as hard-to-read. */
  failedCount?: number;
}

export function BuildStatusView({
  status,
  onPreview,
  onRetry,
  onReview,
}: {
  status: BuildStatus;
  onPreview?: () => void;
  onReview?: () => void;
  onRetry?: () => void;
}) {
  const { phase, pagesCompiled, pagesTotal, lessonCount, failedCount } = status;

  return (
    <div className="bg-panel border border-line rounded-2xl p-6 flex flex-col items-center text-center gap-3">
      {phase === 'checking' && (
        <>
          <Spinner />
          <p className="text-sm text-ink2">Checking…</p>
        </>
      )}

      {phase === 'compiling' && (
        <>
          <Image src="/mochi-base-transparent.png" alt="Mochi" width={56} height={56}
            className="object-contain animate-bounce" />
          <h3 className="text-base font-semibold text-ink">Mochi is building your lessons</h3>
          <p className="text-sm text-ink2 max-w-sm">
            Usually 1–3 minutes. You can leave this page — we&apos;ll keep working.
          </p>
          <p className="text-sm font-medium text-accent" data-testid="compile-progress">
            {pagesTotal && pagesTotal > 0
              ? `Compiling ${pagesCompiled ?? 0}/${pagesTotal} pages…`
              : 'Compiling…'}
          </p>
        </>
      )}

      {phase === 'ready' && (
        <>
          <div className="text-3xl" aria-hidden="true">🎉</div>
          <h3 className="text-base font-semibold text-ink">Lessons ready!</h3>
          {typeof lessonCount === 'number' && lessonCount > 0 && (
            <p className="text-sm text-ink2">
              Mochi compiled {lessonCount} page{lessonCount === 1 ? '' : 's'} from your notes.
            </p>
          )}
          {onPreview && (
            <button onClick={onPreview}
              className="mt-1 px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/80 transition">
              Preview lessons →
            </button>
          )}
        </>
      )}

      {phase === 'timeout' && (
        <>
          <div className="text-2xl" aria-hidden="true">⏳</div>
          <h3 className="text-base font-semibold text-ink">This is taking longer than usual</h3>
          <p className="text-sm text-ink2 max-w-sm">
            Mochi is still working. Check back shortly, or try again.
          </p>
          {onRetry && (
            <button onClick={onRetry}
              className="mt-1 px-4 py-2 rounded-lg border border-line text-sm font-semibold text-ink hover:bg-panel2 transition">
              Retry
            </button>
          )}
        </>
      )}

      {/* Hard-to-read pages — shown alongside compiling/ready, never as a false success. */}
      {!!failedCount && failedCount > 0 && phase !== 'checking' && (
        <div className="mt-2 w-full rounded-lg bg-warn/10 border border-warn/30 px-3 py-2 text-xs text-warn flex items-center justify-between gap-2">
          <span>
            {failedCount} page{failedCount === 1 ? ' was' : 's were'} hard to read — Mochi may have
            missed some content.
          </span>
          {onReview && (
            <button onClick={onReview} className="underline font-semibold whitespace-nowrap">
              Review
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <div className="h-6 w-6 rounded-full border-2 border-line border-t-accent animate-spin"
      role="status" aria-label="Loading" />
  );
}
