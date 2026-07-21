'use client';

import Link from 'next/link';
import type { CompilePageFailure } from '@/lib/api';
import type { UploadStatus } from '@/lib/upload-pipeline';

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
  /** The single derived status (deriveUploadStatus). While the compile is not yet
   *  READY, this panel renders THIS message instead of its own independent
   *  "still compiling" string — so it can never contradict the status chip. */
  status?: UploadStatus;
  classId?: string;
  /** Machine-readable failure cause from the avatar poll (compileFailureKind):
   *  'IRRELEVANT' (subject mismatch), 'FAILED' (extraction), 'MIXED', or null.
   *  Drives which RECOVERY affordance is offered — see the button block below. */
  compileFailureKind?: string | null;
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
  status,
  classId,
  compileFailureKind,
  onUploadMore,
  onRetryCompile,
}: UploadResultProps) {
  const partial = brainReady && failedPages.length > 0;
  const totalPages = wikiPageCount + failedPages.length;
  const failedTone = status?.kind === 'failed';
  // A subject-mismatch (IRRELEVANT) rejection is TERMINAL for recompiling — the
  // relevance verdict never changes on a recompile, so "Recompile" is a dead end.
  // The only genuine recovery is re-uploading (with the server's Add-Anyway override,
  // or a different file). Hide Recompile and make re-upload the primary action.
  // FAILED (extraction) and MIXED keep Recompile — it can still help.
  const isIrrelevant = compileFailureKind === 'IRRELEVANT';

  if (ok > 0) {
    return (
      <div
        className={`rounded-xl px-4 py-4 space-y-3 border ${
          failedTone
            ? 'bg-bad/10 border-bad/30'
            : partial
              ? 'bg-warn/10 border-warn/30'
              : 'bg-ok/10 border-ok/30'
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
            // NOT-ready branch — render the SINGLE owner's message (compiling /
            // timeout / failed / awaiting), never an independent string that could
            // contradict the status chip.
            <p className={failedTone ? 'text-bad' : 'text-ink2'}>
              {status?.message ??
                'Still compiling in the background — this can take a minute for large uploads.'}
              {!failedTone && ok > 0 && ` ${ok} file${ok === 1 ? '' : 's'} uploaded.`}
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
          {/* Recompile affordance — the failure copy says "try recompiling", so the
              action must be present in BOTH the partial (warn) and the hard-failed
              (bad) states, not only partial. Without this the only button in a failed
              state was "Upload more", which doesn't recompile the saved files. */}
          {(partial || failedTone) && onRetryCompile && !isIrrelevant && (
            <button
              onClick={onRetryCompile}
              className={`px-3 py-1.5 rounded-lg text-white text-xs font-semibold transition-colors ${
                failedTone ? 'bg-accent hover:bg-accent/80' : 'bg-warn hover:bg-warn/80'
              }`}
            >
              Recompile
            </button>
          )}
          {/* For an IRRELEVANT rejection, re-upload IS the recovery — promote it to the
              primary (accent) action; otherwise it stays the secondary "Upload more". */}
          <button
            onClick={onUploadMore}
            className={
              isIrrelevant
                ? 'px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold hover:bg-accent/80 transition-colors'
                : 'px-3 py-1.5 rounded-lg border border-line text-ink2 text-xs font-medium hover:bg-panel2 transition-colors'
            }
          >
            {isIrrelevant ? 'Upload a different file' : 'Upload more'}
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
