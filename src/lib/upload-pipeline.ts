// Web replica of the mobile app's upload pipeline (UploadViewModel). Per file:
//   1. client-side validation (size + extension)
//   2. relevance pre-check  POST /avatars/{id}/relevance {contentSample}
//   3. upload               POST /avatars/{id}/files  (skipRelevance on fail-open
//                           or low relevance, matching mobile's "Add Anyway")
// then once for the batch:
//   4. recompile            POST /avatars/{id}/wiki/recompile
//   5. poll                 GET  /avatars/{id}  until brainState READY (or timeout)
//
// Keep this in lockstep with lib/features/upload/presentation/upload_view_model.dart.

import { api } from '@/lib/api';

export const MAX_FILES = 10;
export const MAX_FILE_BYTES = 25 * 1024 * 1024; // matches backend cap
export const ALLOWED_EXT = ['pdf', 'jpg', 'jpeg', 'png', 'heic', 'webp', 'txt'];
export const ACCEPT_ATTR = '.pdf,.jpg,.jpeg,.png,.heic,.webp,.txt';

export type FileStage =
  | 'queued'
  | 'checkingRelevance'
  | 'uploading'
  | 'done'
  | 'warning' // uploaded despite low relevance
  | 'error';

export interface FileProgress {
  name: string;
  stage: FileStage;
  message?: string;
  pageCount?: number;
}

/** Returns a user-friendly error string if the file is invalid, else null. */
export function validateFile(file: File): string | null {
  if (file.size === 0) return `"${file.name}" appears to be empty.`;
  if (file.size > MAX_FILE_BYTES) {
    const mb = (file.size / (1024 * 1024)).toFixed(1);
    return `"${file.name}" is ${mb}MB — max is 25MB.`;
  }
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (!ALLOWED_EXT.includes(ext)) {
    return `"${file.name}" is a .${ext} file — only PDF, image, and text files are supported.`;
  }
  return null;
}

/** Reads up to 500 chars for text files; binary files fall back to the name. */
async function contentSampleFor(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'txt') {
    try {
      const text = await file.text();
      return text.slice(0, 500);
    } catch {
      /* fall through */
    }
  }
  return file.name;
}

export interface PipelineResult {
  files: FileProgress[];
  brainReady: boolean;
  wikiPageCount: number;
}

/**
 * Runs the full mobile-parity pipeline for up to {@link MAX_FILES} files against
 * one avatar. Files are processed sequentially so one failure never blocks the
 * rest. `onUpdate` is called after every state change for live UI.
 */
export async function runUploadPipeline(
  avatarId: string,
  files: File[],
  onUpdate: (progress: FileProgress[]) => void
): Promise<PipelineResult> {
  const batch = files.slice(0, MAX_FILES);
  const progress: FileProgress[] = batch.map((f) => ({ name: f.name, stage: 'queued' }));
  const emit = () => onUpdate([...progress]);
  emit();

  let anyUploaded = false;

  for (let i = 0; i < batch.length; i++) {
    const file = batch[i];

    const invalid = validateFile(file);
    if (invalid) {
      progress[i] = { name: file.name, stage: 'error', message: invalid };
      emit();
      continue;
    }

    // 2. relevance pre-check (fail-open exactly like mobile)
    progress[i] = { name: file.name, stage: 'checkingRelevance' };
    emit();
    let skipRelevance = false;
    let lowRelevance = false;
    try {
      const sample = await contentSampleFor(file);
      const rel = await api.checkRelevance(avatarId, sample);
      if (!rel.data.isRelevant) {
        lowRelevance = true;
        skipRelevance = true; // centre content is curated — upload anyway, flag it
      }
    } catch {
      // Relevance check errored → upload anyway (fail-open).
      skipRelevance = true;
    }

    // 3. upload
    progress[i] = { name: file.name, stage: 'uploading' };
    emit();
    try {
      const res = await api.uploadFile(avatarId, file, { skipRelevance });
      anyUploaded = true;
      progress[i] = {
        name: file.name,
        stage: lowRelevance ? 'warning' : 'done',
        pageCount: res.data?.pageCount,
        message: lowRelevance
          ? 'Uploaded — looked off-topic for this subject, double-check it fits.'
          : undefined,
      };
    } catch (err) {
      progress[i] = { name: file.name, stage: 'error', message: friendlyError(err, file.name) };
    }
    emit();
  }

  // 4. recompile once for the batch (mobile fires per upload; recompile is idempotent)
  if (anyUploaded) {
    try {
      await api.recompile(avatarId);
    } catch {
      /* non-fatal — backend also schedules recompile after upload */
    }
  }

  // 5. poll brainState until READY (cap ~90s; otherwise it finishes in background)
  let brainReady = false;
  let wikiPageCount = 0;
  if (anyUploaded) {
    for (let attempt = 0; attempt < 18; attempt++) {
      await sleep(5000);
      try {
        const a = await api.avatar(avatarId);
        wikiPageCount = a.data.wikiPageCount ?? 0;
        if ((a.data.brainState ?? 'READY') === 'READY' && wikiPageCount > 0) {
          brainReady = true;
          break;
        }
      } catch {
        /* transient — keep polling until the cap */
      }
    }
  }

  return { files: progress, brainReady, wikiPageCount };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function friendlyError(err: unknown, fileName: string): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('413')) return `"${fileName}" is too large (max 25MB).`;
  if (msg.includes('415')) return `"${fileName}" isn't a supported file type.`;
  if (msg.includes('409')) return `"${fileName}" is already in this Mochi's brain.`;
  if (msg.includes('401')) return 'Session expired — please sign in again.';
  return `Upload of "${fileName}" failed. Please try again.`;
}
