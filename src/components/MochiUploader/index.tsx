'use client';

import { useRef, useState, useCallback } from 'react';
import {
  ACCEPT_ATTR,
  MAX_FILES,
  runUploadPipeline,
  recompileAndPollBrain,
  uploadSingleFile,
  type CompileState,
  type FileProgress,
} from '@/lib/upload-pipeline';
import { api, type CompilePageFailure } from '@/lib/api';
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
  // Compile runs out-of-band after uploads finish (Bug #1) so the uploader stays
  // usable. 'idle' = no compile in flight.
  const [compileState, setCompileState] = useState<CompileState | 'idle'>('idle');
  const [compilePages, setCompilePages] = useState(0);
  const [compileFailures, setCompileFailures] = useState<CompilePageFailure[]>([]);
  const [result, setResult] = useState<{
    ok: number;
    failed: number;
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

  // Fires recompile + brain poll OUT of band (Bug #1) so uploads never block on
  // the slow compile. Drives the "Compiling… / Ready" chip.
  const startCompileWatch = useCallback(() => {
    setCompileState('compiling');
    setCompilePages(0);
    setCompileFailures([]);
    void recompileAndPollBrain(avatarId, setCompileState).then((o) => {
      setCompilePages(o.wikiPageCount);
      setCompileFailures(o.failedPages);
      onComplete?.(o.wikiPageCount);
    });
  }, [avatarId, onComplete]);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList).slice(0, MAX_FILES);

    setRunning(true);
    setResult(null);
    setCompileState('idle');
    setCompilePages(0);
    setCompileFailures([]);
    resetReviewState();
    // Uploads only — recompile/poll runs non-blocking below, so the uploader
    // returns to idle the moment uploads finish and more files can be queued.
    const pipelineResult = await runUploadPipeline(avatarId, files, setProgress, {
      recompileAndPoll: false,
    });
    setRunning(false);

    const ok = pipelineResult.files.filter((f) => f.stage === 'done' || f.stage === 'warning').length;
    const failed = pipelineResult.files.filter((f) => f.stage === 'error').length;
    setResult({ ok, failed });
    if (inputRef.current) inputRef.current.value = '';
    if (ok > 0) {
      trackEvent('content_uploaded', { avatarId, fileCount: ok });
      startCompileWatch();
    } else {
      onComplete?.(0);
    }
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

    setRunning(false);
    if (updated.stage === 'done' || updated.stage === 'warning') {
      startCompileWatch(); // non-blocking recompile + poll
    }
  }, [avatarId, progress, startCompileWatch]);

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
    setCompileState('idle');
    setCompilePages(0);
    setCompileFailures([]);
    resetReviewState();

    try {
      const blob = new Blob([pasteText], { type: 'text/plain' });
      const timestamp = Date.now();
      const file = new File([blob], `typed-notes-${timestamp}.txt`, { type: 'text/plain' });

      const pipelineResult = await runUploadPipeline(avatarId, [file], setProgress, {
        recompileAndPoll: false,
      });

      const ok = pipelineResult.files.filter((f) => f.stage === 'done' || f.stage === 'warning').length;
      const failed = pipelineResult.files.filter((f) => f.stage === 'error').length;
      setResult({ ok, failed });
      if (ok > 0) {
        trackEvent('content_uploaded', { avatarId, fileCount: ok, source: 'paste' });
        setPasteText('');
        startCompileWatch();
      } else {
        onComplete?.(0);
      }
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
    setCompileState('idle');
    setCompilePages(0);
    setCompileFailures([]);
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
              <p className="text-xs text-ink3 mt-0.5">
                Tip: pick several files at once — they compile together (one pass).
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

      {/* Non-blocking compile indicator — uploads don't wait on it */}
      {compileState !== 'idle' && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-panel2 border border-line text-sm">
          {compileState === 'compiling' && (
            <>
              <span className="inline-block w-3.5 h-3.5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
              <span className="text-ink2">Compiling your notes… you can add more files meanwhile.</span>
            </>
          )}
          {compileState === 'ready' && compileFailures.length === 0 && (
            <span className="text-ok">&#10003; Notes compiled — {compilePages} page{compilePages === 1 ? '' : 's'} ready.</span>
          )}
          {compileState === 'ready' && compileFailures.length > 0 && (
            <span className="text-warn">
              &#9888; {compilePages} of {compilePages + compileFailures.length} pages compiled — {compileFailures.length} failed. Recompile to complete the brain.
            </span>
          )}
          {compileState === 'timeout' && (
            <span className="text-ink2">Still compiling — modules will appear here shortly.</span>
          )}
        </div>
      )}

      {/* Upload result summary */}
      {result && (
        <UploadResult
          ok={result.ok}
          failed={result.failed}
          brainReady={compileState === 'ready'}
          wikiPageCount={compilePages}
          failedPages={compileFailures}
          classId={classId}
          onUploadMore={uploadMore}
          onRetryCompile={startCompileWatch}
        />
      )}
    </div>
  );
}
