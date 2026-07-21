'use client';

import { type FileProgress } from '@/lib/upload-pipeline';

const STAGE_LABEL: Record<FileProgress['stage'], { icon: string; cls: string }> = {
  queued:            { icon: '•', cls: 'text-ink3' },
  checkingRelevance: { icon: '⋯', cls: 'text-ink3' },
  uploading:         { icon: '↑', cls: 'text-accent' },
  done:              { icon: '✓', cls: 'text-ok' },
  warning:           { icon: '!',     cls: 'text-warn' },
  segmented:         { icon: '📑', cls: 'text-accent' },
  error:             { icon: '✕', cls: 'text-bad' },
  compiling:         { icon: '⋯', cls: 'text-accent' },
  compileTimeout:    { icon: '!',     cls: 'text-warn' },
  compileFailed:     { icon: '✕', cls: 'text-bad' },
};

interface FileProgressListProps {
  progress: FileProgress[];
  running: boolean;
  reviewExpanded: Record<number, boolean>;
  reviewTexts: Record<number, string>;
  reviewSaving: Record<number, boolean>;
  onRetry: (index: number) => void;
  onRemove: (index: number) => void;
  onSwitchToPaste: () => void;
  onReviewExpand: (index: number) => void;
  onReviewTextChange: (index: number, text: string) => void;
  onReviewApprove: (index: number) => void;
  onReviewEdit: (index: number) => void;
  onReviewCancel: (index: number) => void;
}

export default function FileProgressList({
  progress,
  running,
  reviewExpanded,
  reviewTexts,
  reviewSaving,
  onRetry,
  onRemove,
  onSwitchToPaste,
  onReviewExpand,
  onReviewTextChange,
  onReviewApprove,
  onReviewEdit,
  onReviewCancel,
}: FileProgressListProps) {
  if (progress.length === 0) return null;

  return (
    <ul className="space-y-2">
      {progress.map((f, i) => {
        const s = STAGE_LABEL[f.stage];
        const isBorderline = f.quality === 'BORDERLINE';
        const isRejected = f.quality === 'REJECTED';
        const isGood = f.quality === 'GOOD';
        const borderColor = isRejected
          ? 'border-bad/40'
          : isBorderline
            ? 'border-warn/40'
            : isGood
              ? 'border-ok/30'
              : 'border-transparent';

        return (
          <li
            key={`${f.name}-${i}`}
            className={`text-sm bg-panel2 rounded-lg px-3 py-2 border ${borderColor}`}
          >
            <div className="flex items-start gap-3">
              <span className={`font-bold ${s.cls}`}>{s.icon}</span>
              <div className="min-w-0 flex-1">
                <p className="text-ink truncate">{f.name}</p>
                {f.message && <p className={`text-xs ${s.cls}`}>{f.message}</p>}
                {f.stage === 'checkingRelevance' && (
                  <p className="text-xs text-ink3">Checking relevance...</p>
                )}
                {f.stage === 'uploading' && <p className="text-xs text-ink3">Uploading...</p>}
                {f.stage === 'done' && f.pageCount != null && (
                  // Per-file EXTRACTION fact from the upload — NOT compile status.
                  // The aggregate compile message has a single owner (the status
                  // chip via deriveUploadStatus); this line must not claim "compiled".
                  <p className="text-xs text-ink3">{f.pageCount} page{f.pageCount === 1 ? '' : 's'} read</p>
                )}
                {f.stage === 'done' && f.degraded && !isBorderline && (
                  <p className="text-xs text-warn">Read with backup engine — double-check the text looks right.</p>
                )}
                {/* Quality: GOOD checkmark */}
                {isGood && f.stage === 'done' && (
                  <p className="text-xs text-ok">Text quality verified</p>
                )}
              </div>
              {/* Per-file retry for errors */}
              {f.stage === 'error' && f.file && !running && !isRejected && (
                <button
                  onClick={() => onRetry(i)}
                  className="shrink-0 text-xs font-semibold text-accent hover:text-accent/80 transition-colors"
                >
                  Retry
                </button>
              )}
              {/* Remove action for low-relevance warnings */}
              {f.stage === 'warning' && f.lowRelevance && (
                <button
                  onClick={() => onRemove(i)}
                  className="shrink-0 text-xs text-ink3 hover:text-bad transition-colors"
                >
                  Remove
                </button>
              )}
              {/* REJECTED: type instead */}
              {isRejected && (
                <button
                  onClick={onSwitchToPaste}
                  className="shrink-0 text-xs font-semibold text-accent hover:text-accent/80 transition-colors"
                >
                  Type instead
                </button>
              )}
            </div>

            {/* BORDERLINE: quality warning + expandable review */}
            {isBorderline && f.extractedText && f.fileId && (
              <div className="mt-2 space-y-2">
                <div className="bg-warn/10 border border-warn/30 rounded-xl p-3 text-sm text-ink2">
                  {f.qualityReason ?? 'Text quality is borderline. Please review the extracted text.'}
                </div>
                {!reviewExpanded[i] ? (
                  <button
                    onClick={() => onReviewExpand(i)}
                    className="text-xs font-semibold text-accent hover:text-accent/80 transition-colors"
                  >
                    Review extracted text
                  </button>
                ) : (
                  <div className="space-y-2">
                    <textarea
                      value={reviewTexts[i] ?? f.extractedText ?? ''}
                      onChange={(e) => onReviewTextChange(i, e.target.value)}
                      rows={6}
                      className="w-full rounded-xl border border-line bg-panel2 p-3 text-ink text-sm font-mono resize-y min-h-[120px] focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => onReviewApprove(i)}
                        disabled={reviewSaving[i]}
                        className="px-3 py-1.5 rounded-lg bg-ok text-white text-xs font-semibold hover:opacity-90 transition disabled:opacity-40"
                      >
                        {reviewSaving[i] ? 'Saving...' : 'Looks good'}
                      </button>
                      <button
                        onClick={() => onReviewEdit(i)}
                        disabled={reviewSaving[i]}
                        className="px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold hover:opacity-90 transition disabled:opacity-40"
                      >
                        {reviewSaving[i] ? 'Saving...' : 'Save edits'}
                      </button>
                      <button
                        onClick={() => onReviewCancel(i)}
                        className="px-3 py-1.5 rounded-lg border border-line text-ink3 text-xs hover:text-ink2 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
