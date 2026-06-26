'use client';

import Link from 'next/link';
import type { CompilePageFailure } from '@/lib/api';

interface UploadResultProps {
  ok: number;
  /** Failed FILE uploads — a DIFFERENT axis from failed compile pages below. */
  failed: number;
  brainReady: boolean;
  wikiPageCount: number;
  /** Wiki pages the compile could not persist. Non-empty ⇒ the brain is
   *  INCOMPLETE even though it reached READY — surfaced as a warning, never
   *  conflated with the file-upload `failed` count. */
  failedPages?: CompilePageFailure[];
  classId?: string;
  onUploadMore: () => void;
  /** Optional retry that re-runs the recompile + poll (the partial-state path). */
  onRetryCompile?: () => void;
}

export default function UploadResult({
  ok,
  failed,
  brainReady,
  wikiPageCount,
  failedPages = [],
  classId,
  onUploadMore,
  onRetryCompile,
}: UploadResultProps) {
  const partial = brainReady && failedPages.length > 0;
  const totalPages = wikiPageCount + failedPages.length;

  if (ok > 0) {
    return (
      <div
        className={`rounded-xl px-4 py-4 space-y-3 border ${
          partial ? 'bg-warn/10 border-warn/30' : 'bg-ok/10 border-ok/30'
        }`}
      >
        <div className="text-sm text-ink">
          {brainReady ? (
            partial ? (
              <div className="space-y-1">
                <p className="text-ink font-semibold">
                  ⚠️ Brain incomplete — {wikiPageCount} of {totalPages} page
                  {totalPages === 1 ? '' : 's'} compiled, {failedPages.length} failed.
                </p>
                <p className="text-ink2 text-xs">
                  Missing topic{failedPages.length === 1 ? '' : 's'}:{' '}
                  <span className="text-ink">
                    {failedPages.map((f) => f.slug).join(', ')}
                  </span>
                  . Re-upload those notes or recompile to complete the brain before
                  building assignments — students won&apos;t see the missing topics.
                </p>
              </div>
            ) : (
              <p>
                Compiled into the class wiki — students can now learn from it.
                {wikiPageCount > 0 && (
                  <span className="text-ink3">
                    {' '}
                    {wikiPageCount} page{wikiPageCount === 1 ? '' : 's'} total.
                  </span>
                )}
              </p>
            )
          ) : (
            <p className="text-ink2">
              Still compiling in the background — this can take a minute for large uploads.
              {ok > 0 && ` ${ok} file${ok === 1 ? '' : 's'} uploaded.`}
            </p>
          )}
          {failed > 0 && (
            <p className="text-bad text-xs mt-1">
              {failed} file{failed === 1 ? '' : 's'} failed — use the Retry button above.
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {classId && (
            <Link
              href={`/dashboard/classes/${classId}`}
              className="px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/80 transition-colors"
            >
              View content
            </Link>
          )}
          {partial && onRetryCompile && (
            <button
              onClick={onRetryCompile}
              className="px-3 py-1.5 rounded-lg bg-warn text-white text-xs font-semibold hover:bg-warn/80 transition-colors"
            >
              Recompile
            </button>
          )}
          <button
            onClick={onUploadMore}
            className="px-3 py-1.5 rounded-lg border border-line text-ink2 text-xs font-medium hover:bg-panel2 transition-colors"
          >
            Upload more
          </button>
        </div>
      </div>
    );
  }

  if (failed > 0) {
    return (
      <div className="bg-bad/10 border border-bad/30 rounded-xl px-4 py-3 text-sm space-y-2">
        <p className="text-bad">
          {failed} file{failed === 1 ? '' : 's'} failed to upload. Use the Retry buttons above or try different files.
        </p>
        <button
          onClick={onUploadMore}
          className="px-3 py-1.5 rounded-lg border border-line text-ink2 text-xs font-medium hover:bg-panel2 transition-colors"
        >
          Try different files
        </button>
      </div>
    );
  }

  return null;
}
