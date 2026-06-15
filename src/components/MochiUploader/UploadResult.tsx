'use client';

import Link from 'next/link';

interface UploadResultProps {
  ok: number;
  failed: number;
  brainReady: boolean;
  wikiPageCount: number;
  classId?: string;
  onUploadMore: () => void;
}

export default function UploadResult({
  ok,
  failed,
  brainReady,
  wikiPageCount,
  classId,
  onUploadMore,
}: UploadResultProps) {
  if (ok > 0) {
    return (
      <div className="bg-ok/10 border border-ok/30 rounded-xl px-4 py-4 space-y-3">
        <div className="text-sm text-ink">
          {brainReady ? (
            <p>
              Compiled into the class wiki — students can now learn from it.
              {wikiPageCount > 0 && (
                <span className="text-ink3">
                  {' '}{wikiPageCount} page{wikiPageCount === 1 ? '' : 's'} total.
                </span>
              )}
            </p>
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
