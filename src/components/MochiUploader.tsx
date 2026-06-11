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

/**
 * Mobile-parity uploader: pick up to 10 files, run the relevance -> upload ->
 * recompile pipeline against {avatarId}, show per-file progress with retry.
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

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList).slice(0, MAX_FILES);

    setRunning(true);
    setResult(null);
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
    // Note: we don't delete from backend here — that would require
    // tracking the uploaded file ID. For now, just remove from the list.
  }, []);

  function uploadMore() {
    setResult(null);
    setProgress([]);
    inputRef.current?.click();
  }

  return (
    <div className="space-y-4">
      {/* Tips banner — one dismissible tip */}
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
          <p className="text-2xl mb-1">📚</p>
          <p className="text-sm font-semibold text-ink">
            {running ? 'Uploading...' : 'Choose files to upload'}
          </p>
          <p className="text-xs text-ink3 mt-1">
            Up to {MAX_FILES} at a time · PDF, images, or text · max 25MB each
          </p>
        </button>
      )}

      {/* Per-file progress */}
      {progress.length > 0 && (
        <ul className="space-y-2">
          {progress.map((f, i) => {
            const s = STAGE_LABEL[f.stage];
            return (
              <li
                key={`${f.name}-${i}`}
                className="flex items-start gap-3 text-sm bg-panel2 rounded-lg px-3 py-2"
              >
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
                  {f.stage === 'done' && f.degraded && (
                    <p className="text-xs text-warn">Read with backup engine — double-check the text looks right.</p>
                  )}
                </div>
                {/* Per-file retry for errors */}
                {f.stage === 'error' && f.file && !running && (
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
