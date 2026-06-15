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
import InfoBanner from '../InfoBanner';
import FileProgressList from './FileProgressList';
import PasteMode from './PasteMode';
import UploadResult from './UploadResult';

type InputMode = 'upload' | 'paste';

const MIN_PASTE_CHARS = 50;

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

  function resetReviewState() {
    setReviewExpanded({});
    setReviewTexts({});
    setReviewSaving({});
  }

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList).slice(0, MAX_FILES);

    setRunning(true);
    setResult(null);
    resetReviewState();
    const pipelineResult = await runUploadPipeline(avatarId, files, setProgress);
    setRunning(false);

    const ok = pipelineResult.files.filter((f) => f.stage === 'done' || f.stage === 'warning').length;
    const failed = pipelineResult.files.filter((f) => f.stage === 'error').length;
    setResult({ ok, failed, brainReady: pipelineResult.brainReady, wikiPageCount: pipelineResult.wikiPageCount });
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
    resetReviewState();

    try {
      const blob = new Blob([pasteText], { type: 'text/plain' });
      const timestamp = Date.now();
      const file = new File([blob], `typed-notes-${timestamp}.txt`, { type: 'text/plain' });

      const pipelineResult = await runUploadPipeline(avatarId, [file], setProgress);

      const ok = pipelineResult.files.filter((f) => f.stage === 'done' || f.stage === 'warning').length;
      const failed = pipelineResult.files.filter((f) => f.stage === 'error').length;
      setResult({ ok, failed, brainReady: pipelineResult.brainReady, wikiPageCount: pipelineResult.wikiPageCount });
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
    resetReviewState();
    if (mode === 'upload') {
      inputRef.current?.click();
    }
  }

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
        <PasteMode
          value={pasteText}
          submitting={pasteSubmitting}
          onChange={setPasteText}
          onSubmit={handlePasteSubmit}
        />
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
      <FileProgressList
        progress={progress}
        running={running}
        reviewExpanded={reviewExpanded}
        reviewTexts={reviewTexts}
        reviewSaving={reviewSaving}
        onRetry={retryFile}
        onRemove={removeFile}
        onSwitchToPaste={() => { setMode('paste'); setPasteText(''); }}
        onReviewExpand={(i) => {
          setReviewExpanded((s) => ({ ...s, [i]: true }));
          if (!(i in reviewTexts)) {
            setReviewTexts((s) => ({ ...s, [i]: progress[i].extractedText ?? '' }));
          }
        }}
        onReviewTextChange={(i, text) => setReviewTexts((s) => ({ ...s, [i]: text }))}
        onReviewApprove={handleReviewApprove}
        onReviewEdit={handleReviewEdit}
        onReviewCancel={(i) => setReviewExpanded((s) => ({ ...s, [i]: false }))}
      />

      {/* Upload result summary */}
      {result && (
        <UploadResult
          ok={result.ok}
          failed={result.failed}
          brainReady={result.brainReady}
          wikiPageCount={result.wikiPageCount}
          classId={classId}
          onUploadMore={uploadMore}
        />
      )}
    </div>
  );
}
