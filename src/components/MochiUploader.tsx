'use client';

import { useRef, useState, useCallback } from 'react';
import {
  ACCEPT_ATTR,
  MAX_FILES,
  runUploadPipeline,
  uploadSingleFile,
  type FileProgress,
} from '@/lib/upload-pipeline';
import { api } from '@/lib/api';
import { trackEvent } from '@/lib/analytics';
import InfoBanner from './InfoBanner';
import Link from 'next/link';

const STAGE_LABEL: Record<FileProgress['stage'], { icon: string; cls: string }> = {
  queued:            { icon: '•', cls: 'text-ink3' },
  checkingRelevance: { icon: '⋯', cls: 'text-ink3' },
  uploading:         { icon: '↑', cls: 'text-accent' },
  done:              { icon: '✓', cls: 'text-ok' },
  warning:           { icon: '!',     cls: 'text-warn' },
  error:             { icon: '✕', cls: 'text-bad' },
  compiling:         { icon: '⋯', cls: 'text-accent' },
  compileTimeout:    { icon: '!',     cls: 'text-warn' },
  compileFailed:     { icon: '✕', cls: 'text-bad' },
};

type InputMode = 'upload' | 'paste';

const MIN_PASTE_CHARS = 50;
const WARN_PASTE_CHARS = 5000;

/**
 * Mobile-parity uploader: pick up to 10 files, run the relevance -> upload ->
 * recompile pipeline against {avatarId}, show per-file progress with retry.
 * Also supports a "Paste text" mode for direct text entry.
 */
export default function MochiUploader({
  avatarId,
  classId,
  onComplete,
}: {
  avatarId: string;
  /** Optional class ID for "View content" link after upload. */
  classId?: string;
  onComplete?: (pageCount: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<FileProgress[]>([]);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<{
    ok: number;
    failed: number;
    brainReady: boolean;
    wikiPageCount: number;
  } | null>(null);
  const [mode, setMode] = useState<InputMode>('upload');
  const [pasteText, setPasteText] = useState('');
  const [pasteSubmitting, setPasteSubmitting] = useState(false);

  // Per-file review state: expanded text areas keyed by index
  const [reviewExpanded, setReviewExpanded] = useState<Record<number, boolean>>({});
  const [reviewTexts, setReviewTexts] = useState<Record<number, string>>({});
  const [reviewSaving, setReviewSaving] = useState<Record<number, boolean>>({});

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList).slice(0, MAX_FILES);

    setRunning(true);
    setResult(null);
    setReviewExpanded({});
    setReviewTexts({});
    setReviewSaving({});
    const pipelineResult = await runUploadPipeline(avatarId, files, setProgress);
    setRunning(false);

    const ok = pipelineResult.files.filter((f) => f.stage === 'done' || f.stage === 'warning').length;
    const failed = pipelineResult.files.filter((f) => f.stage === 'error').length;
    setResult({
      ok,
      failed,
      brainReady: pipelineResult.brainReady,
      wikiPageCount: pipelineResult.wikiPageCount,
    });
    if (ok > 0) {
      trackEvent('content_uploaded', { avatarId, fileCount: ok });
    }
    if (inputRef.current) inputRef.current.value = '';
    onComplete?.(pipelineResult.wikiPageCount);
  }

  const retryFile = useCallback(async (index: number) => {
    const fp = progress[index];
    if (!fp.file) return;

    setRunning(true);
    const updated = await uploadSingleFile(avatarId, fp.file, (p) => {
      setProgress((prev) => {
        const next = [...prev];
        next[index] = p;
        return next;
      });
    });

    // If retry succeeded, trigger recompile
    if (updated.stage === 'done' || updated.stage === 'warning') {
      try { await api.recompile(avatarId); } catch { /* non-fatal */ }
    }
    setRunning(false);
  }, [avatarId, progress]);

  const removeFile = useCallback(async (index: number) => {
    setProgress((prev) => {
      const next = [...prev];
      next.splice(index, 1);
      return next;
    });
  }, []);

  async function handlePasteSubmit() {
    if (pasteText.length < MIN_PASTE_CHARS) return;
    setPasteSubmitting(true);
    setResult(null);
    setReviewExpanded({});
    setReviewTexts({});
    setReviewSaving({});

    try {
      const blob = new Blob([pasteText], { type: 'text/plain' });
      const timestamp = Date.now();
      const file = new File([blob], `typed-notes-${timestamp}.txt`, { type: 'text/plain' });

      const pipelineResult = await runUploadPipeline(avatarId, [file], setProgress);

      const ok = pipelineResult.files.filter((f) => f.stage === 'done' || f.stage === 'warning').length;
      const failed = pipelineResult.files.filter((f) => f.stage === 'error').length;
      setResult({
        ok,
        failed,
        brainReady: pipelineResult.brainReady,
        wikiPageCount: pipelineResult.wikiPageCount,
      });
      if (ok > 0) {
        trackEvent('content_uploaded', { avatarId, fileCount: ok, source: 'paste' });
        setPasteText('');
      }
      onComplete?.(pipelineResult.wikiPageCount);
    } finally {
      setPasteSubmitting(false);
    }
  }

  async function handleReviewApprove(index: number) {
    const fp = progress[index];
    if (!fp.fileId) return;
    setReviewSaving((s) => ({ ...s, [index]: true }));
    try {
      await api.reviewFile(avatarId, fp.fileId, 'APPROVE');
      setProgress((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], quality: 'GOOD', message: undefined };
        return next;
      });
      setReviewExpanded((s) => ({ ...s, [index]: false }));
    } catch { /* non-fatal */ }
    setReviewSaving((s) => ({ ...s, [index]: false }));
  }

  async function handleReviewEdit(index: number) {
    const fp = progress[index];
    if (!fp.fileId) return;
    const editedText = reviewTexts[index] ?? fp.extractedText ?? '';
    setReviewSaving((s) => ({ ...s, [index]: true }));
    try {
      await api.reviewFile(avatarId, fp.fileId, 'EDIT', editedText);
      setProgress((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], quality: 'GOOD', message: 'Text updated and saved.' };
        return next;
      });
      setReviewExpanded((s) => ({ ...s, [index]: false }));
    } catch { /* non-fatal */ }
    setReviewSaving((s) => ({ ...s, [index]: false }));
  }

  function uploadMore() {
    setResult(null);
    setProgress([]);
    setReviewExpanded({});
    setReviewTexts({});
    setReviewSaving({});
    if (mode === 'upload') {
      inputRef.current?.click();
    }
  }

  const charCount = pasteText.length;
  const isUploadMode = mode === 'upload';

  return (
    <div className="space-y-4">
      {/* Mode toggle */}
      <div className="flex gap-1 p-1 bg-panel2 rounded-lg w-fit">
        <button
          onClick={() => setMode('paste')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            !isUploadMode ? 'bg-accent text-white' : 'text-ink3 hover:text-ink2'
          }`}
        >
          Paste text
        </button>
        <button
          onClick={() => setMode('upload')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            isUploadMode ? 'bg-accent text-white' : 'text-ink3 hover:text-ink2'
          }`}
        >
          Upload files
        </button>
      </div>

      {/* Tips banner */}
      {isUploadMode ? (
        <InfoBanner id="upload-tips" variant="tip">
          <p className="text-sm">
            Upload clear scans or photos of your teaching material — printed text works best.
          </p>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="text-xs px-2 py-0.5 rounded-full bg-ok/15 text-ok">Printed text &#10003;</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-ok/15 text-ok">Clear scans &#10003;</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-warn/15 text-warn">Handwriting may be missed</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-panel2 text-ink3">Max 25MB per file</span>
          </div>
        </InfoBanner>
      ) : (
        <InfoBanner id="paste-tips" variant="tip">
          <p className="text-sm">
            Pasting text gives the cleanest results. Great for digital worksheets and typed notes.
          </p>
        </InfoBanner>
      )}

      {/* Paste text mode */}
      {!isUploadMode && !result && (
        <div className="space-y-3">
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="Paste or type your teaching materials here..."
            rows={8}
            className="w-full rounded-xl border border-line bg-panel2 p-4 text-ink text-sm font-mono resize-y min-h-[200px] focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
          />
          <div className="flex items-center justify-between">
            <p className={`text-xs ${charCount > 0 && charCount < MIN_PASTE_CHARS ? 'text-warn' : charCount >= WARN_PASTE_CHARS ? 'text-warn' : 'text-ink3'}`}>
              {charCount === 0
                ? `Minimum ${MIN_PASTE_CHARS} characters`
                : charCount < MIN_PASTE_CHARS
                  ? `${MIN_PASTE_CHARS - charCount} more characters needed`
                  : charCount >= WARN_PASTE_CHARS
                    ? `${charCount.toLocaleString()} characters (large input may take longer)`
                    : `${charCount.toLocaleString()} characters`}
            </p>
          </div>
          <button
            onClick={handlePasteSubmit}
            disabled={charCount < MIN_PASTE_CHARS || pasteSubmitting}
            className="w-full py-3 rounded-xl bg-accent text-white font-semibold text-sm hover:opacity-90 transition disabled:opacity-40"
          >
            {pasteSubmitting ? 'Adding...' : 'Add to class content'}
          </button>
        </div>
      )}

      {/* Upload files mode */}
      {isUploadMode && (
        <>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPT_ATTR}
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />

          {/* Drop zone — hide when showing success result */}
          {!result && (
            <button
              onClick={() => inputRef.current?.click()}
              disabled={running}
              className="w-full py-8 rounded-2xl border-2 border-dashed border-line hover:border-accent/50 bg-panel2 text-center transition disabled:opacity-50"
            >
              <p className="text-2xl mb-1">&#128218;</p>
              <p className="text-sm font-semibold text-ink">
                {running ? 'Uploading...' : 'Choose files to upload'}
              </p>
              <p className="text-xs text-ink3 mt-1">
                Up to {MAX_FILES} at a time &middot; PDF, images, or text &middot; max 25MB each
              </p>
            </button>
          )}
        </>
      )}

      {/* Per-file progress */}
      {progress.length > 0 && (
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
                      <p className="text-xs text-ink3">{f.pageCount} pages compiled</p>
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
                      onClick={() => retryFile(i)}
                      className="shrink-0 text-xs font-semibold text-accent hover:text-accent/80 transition-colors"
                    >
                      Retry
                    </button>
                  )}
                  {/* Remove action for low-relevance warnings */}
                  {f.stage === 'warning' && f.lowRelevance && (
                    <button
                      onClick={() => removeFile(i)}
                      className="shrink-0 text-xs text-ink3 hover:text-bad transition-colors"
                    >
                      Remove
                    </button>
                  )}
                  {/* REJECTED: type instead */}
                  {isRejected && (
                    <button
                      onClick={() => { setMode('paste'); setPasteText(''); }}
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
                        onClick={() => {
                          setReviewExpanded((s) => ({ ...s, [i]: true }));
                          if (!(i in reviewTexts)) {
                            setReviewTexts((s) => ({ ...s, [i]: f.extractedText ?? '' }));
                          }
                        }}
                        className="text-xs font-semibold text-accent hover:text-accent/80 transition-colors"
                      >
                        Review extracted text
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <textarea
                          value={reviewTexts[i] ?? f.extractedText ?? ''}
                          onChange={(e) => setReviewTexts((s) => ({ ...s, [i]: e.target.value }))}
                          rows={6}
                          className="w-full rounded-xl border border-line bg-panel2 p-3 text-ink text-sm font-mono resize-y min-h-[120px] focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleReviewApprove(i)}
                            disabled={reviewSaving[i]}
                            className="px-3 py-1.5 rounded-lg bg-ok text-white text-xs font-semibold hover:opacity-90 transition disabled:opacity-40"
                          >
                            {reviewSaving[i] ? 'Saving...' : 'Looks good'}
                          </button>
                          <button
                            onClick={() => handleReviewEdit(i)}
                            disabled={reviewSaving[i]}
                            className="px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-semibold hover:opacity-90 transition disabled:opacity-40"
                          >
                            {reviewSaving[i] ? 'Saving...' : 'Save edits'}
                          </button>
                          <button
                            onClick={() => setReviewExpanded((s) => ({ ...s, [i]: false }))}
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
      )}

      {/* Success state with CTAs */}
      {result && result.ok > 0 && (
        <div className="bg-ok/10 border border-ok/30 rounded-xl px-4 py-4 space-y-3">
          <div className="text-sm text-ink">
            {result.brainReady ? (
              <p>
                Compiled into the class wiki — students can now learn from it.
                {result.wikiPageCount > 0 && (
                  <span className="text-ink3">
                    {' '}{result.wikiPageCount} page{result.wikiPageCount === 1 ? '' : 's'} total.
                  </span>
                )}
              </p>
            ) : (
              <p className="text-ink2">
                Still compiling in the background — this can take a minute for large uploads.
                {result.ok > 0 && ` ${result.ok} file${result.ok === 1 ? '' : 's'} uploaded.`}
              </p>
            )}
            {result.failed > 0 && (
              <p className="text-bad text-xs mt-1">
                {result.failed} file{result.failed === 1 ? '' : 's'} failed — use the Retry button above.
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
              onClick={uploadMore}
              className="px-3 py-1.5 rounded-lg border border-line text-ink2 text-xs font-medium hover:bg-panel2 transition-colors"
            >
              Upload more
            </button>
          </div>
        </div>
      )}

      {/* Error-only summary (all failed, none succeeded) */}
      {result && result.ok === 0 && result.failed > 0 && (
        <div className="bg-bad/10 border border-bad/30 rounded-xl px-4 py-3 text-sm space-y-2">
          <p className="text-bad">
            {result.failed} file{result.failed === 1 ? '' : 's'} failed to upload. Use the Retry buttons above or try different files.
          </p>
          <button
            onClick={uploadMore}
            className="px-3 py-1.5 rounded-lg border border-line text-ink2 text-xs font-medium hover:bg-panel2 transition-colors"
          >
            Try different files
          </button>
        </div>
      )}
    </div>
  );
}
