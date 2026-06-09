'use client';

import { useRef, useState } from 'react';
import {
  ACCEPT_ATTR,
  MAX_FILES,
  runUploadPipeline,
  type FileProgress,
} from '@/lib/upload-pipeline';

const STAGE_LABEL: Record<FileProgress['stage'], { icon: string; cls: string }> = {
  queued: { icon: '•', cls: 'text-ink3' },
  checkingRelevance: { icon: '⋯', cls: 'text-ink3' },
  uploading: { icon: '↑', cls: 'text-accent' },
  done: { icon: '✓', cls: 'text-ok' },
  warning: { icon: '!', cls: 'text-warn' },
  error: { icon: '✕', cls: 'text-bad' },
};

/**
 * Mobile-parity uploader: pick up to 10 files, run the relevance → upload →
 * recompile pipeline against {avatarId}, show per-file progress.
 */
export default function MochiUploader({
  avatarId,
  onComplete,
}: {
  avatarId: string;
  onComplete?: (pageCount: number) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<FileProgress[]>([]);
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList).slice(0, MAX_FILES);
    const overflow = fileList.length > MAX_FILES;

    setRunning(true);
    setSummary(null);
    const result = await runUploadPipeline(avatarId, files, setProgress);
    setRunning(false);

    const ok = result.files.filter((f) => f.stage === 'done' || f.stage === 'warning').length;
    const failed = result.files.filter((f) => f.stage === 'error').length;
    setSummary(
      `${ok} uploaded${failed ? `, ${failed} failed` : ''}` +
        (result.brainReady
          ? ` · ${result.wikiPageCount} page${result.wikiPageCount === 1 ? '' : 's'} in the brain`
          : ' · Mochi is still reading in the background…') +
        (overflow ? ` (only the first ${MAX_FILES} were taken)` : '')
    );
    if (inputRef.current) inputRef.current.value = '';
    onComplete?.(result.wikiPageCount);
  }

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT_ATTR}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <button
        onClick={() => inputRef.current?.click()}
        disabled={running}
        className="w-full py-8 rounded-2xl border-2 border-dashed border-line hover:border-accent/50 bg-panel2 text-center transition disabled:opacity-50"
      >
        <p className="text-2xl mb-1">📚</p>
        <p className="text-sm font-semibold text-ink">
          {running ? 'Uploading…' : 'Choose files to upload'}
        </p>
        <p className="text-xs text-ink3 mt-1">
          Up to {MAX_FILES} at a time · PDF, images, or text · max 25MB each
        </p>
      </button>

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
                    <p className="text-xs text-ink3">Checking relevance…</p>
                  )}
                  {f.stage === 'uploading' && <p className="text-xs text-ink3">Uploading…</p>}
                  {f.stage === 'done' && f.pageCount != null && (
                    <p className="text-xs text-ink3">{f.pageCount} pages compiled</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {summary && (
        <div className="bg-ok/10 border border-ok/30 rounded-xl px-4 py-3 text-sm text-ink">
          🎉 {summary}
        </div>
      )}
    </div>
  );
}
