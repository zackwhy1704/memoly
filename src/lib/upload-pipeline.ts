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

import { api, ApiError, type CompilePageFailure } from '@/lib/api';

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
  | 'error'
  | 'compiling'      // recompile in progress
  | 'compileTimeout' // recompile didn't finish in time
  | 'compileFailed'; // recompile errored

export interface FileProgress {
  name: string;
  stage: FileStage;
  message?: string;
  pageCount?: number;
  /** Original File reference for per-file retry. */
  file?: File;
  /** Whether this file had low relevance. */
  lowRelevance?: boolean;
  /** A2: whether this file doesn't look like study material (receipt/selfie/blank). */
  notStudyMaterial?: boolean;
  /** Backend response metadata. */
  servedBy?: string;
  degraded?: boolean;
  /** OCR quality gate result from the backend. */
  quality?: 'GOOD' | 'BORDERLINE' | 'REJECTED';
  qualityReason?: string;
  extractedText?: string;
  fileId?: string;
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
 * Process a single file through the relevance + upload pipeline.
 * Exported so MochiUploader can call it for per-file retry.
 */
export async function uploadSingleFile(
  avatarId: string,
  file: File,
  onProgress: (p: FileProgress) => void
): Promise<FileProgress> {
  const invalid = validateFile(file);
  if (invalid) {
    const p: FileProgress = { name: file.name, stage: 'error', message: invalid, file };
    onProgress(p);
    return p;
  }

  // Relevance check (fail-open)
  onProgress({ name: file.name, stage: 'checkingRelevance', file });
  let skipRelevance = false;
  let lowRelevance = false;
  let notStudyMaterial = false;
  try {
    const sample = await contentSampleFor(file);
    const rel = await api.checkRelevance(avatarId, sample);
    if (!rel.data.isRelevant) {
      lowRelevance = true;
      skipRelevance = true;
    }
    // A2: distinct from off-topic — this doesn't look like study material at all.
    if (rel.data.studyMaterial === false) {
      notStudyMaterial = true;
      skipRelevance = true;
    }
  } catch {
    skipRelevance = true;
  }

  // Upload
  onProgress({ name: file.name, stage: 'uploading', file });
  try {
    const res = await api.uploadFile(avatarId, file, { skipRelevance });
    // Guard new backend fields
    const resData = res.data as Record<string, unknown> | undefined;
    const servedBy = typeof resData?.servedBy === 'string' ? resData.servedBy : undefined;
    const degraded = typeof resData?.degraded === 'boolean' ? resData.degraded : undefined;
    const quality = typeof resData?.quality === 'string' ? resData.quality as 'GOOD' | 'BORDERLINE' | 'REJECTED' : undefined;
    const qualityReason = typeof resData?.qualityReason === 'string' ? resData.qualityReason : undefined;
    const extractedText = typeof resData?.extractedText === 'string' ? resData.extractedText : undefined;
    const fileId = typeof resData?.id === 'string' ? resData.id : (typeof res.data?.id === 'string' ? res.data.id : undefined);

    // Determine stage based on quality
    const qualityStage = quality === 'REJECTED'
      ? 'error' as const
      : (lowRelevance || notStudyMaterial) ? 'warning' as const : 'done' as const;

    const result: FileProgress = {
      name: file.name,
      stage: qualityStage,
      pageCount: res.data?.pageCount,
      file,
      lowRelevance,
      notStudyMaterial,
      servedBy,
      degraded: degraded ?? false,
      quality,
      qualityReason,
      extractedText,
      fileId,
      message: quality === 'REJECTED'
        ? qualityReason ?? 'Content quality too low to process.'
        : quality === 'BORDERLINE'
          ? qualityReason ?? 'Text quality is borderline — please review.'
          : notStudyMaterial
            ? "This doesn't look like study material — added anyway. Remove it if that's not right."
            : lowRelevance
              ? 'Looks off-topic for this class — added anyway.'
              : degraded
                ? 'Read with backup engine — double-check the text looks right.'
                : undefined,
    };
    onProgress(result);
    return result;
  } catch (err) {
    const result: FileProgress = {
      name: file.name,
      stage: 'error',
      message: friendlyError(err, file.name),
      file,
    };
    onProgress(result);
    return result;
  }
}

/**
 * Runs the full mobile-parity pipeline for up to {@link MAX_FILES} files against
 * one avatar. Files are processed sequentially so one failure never blocks the
 * rest. `onUpdate` is called after every state change for live UI.
 */
export type CompileState = 'compiling' | 'ready' | 'timeout';
export interface RecompileOutcome {
  brainReady: boolean;
  wikiPageCount: number;
  /** Pages the (re)compile could NOT persist. A partial compile still reaches
   *  brainState READY, so this is the only honest signal that the brain is
   *  incomplete. Empty on full success. */
  failedPages: CompilePageFailure[];
}

/** Coerce the compile-status payload's failedPages into a clean, typed list —
 *  the boundary guard so a malformed/absent field degrades to [] rather than
 *  leaking `undefined`/junk into the UI (and never silently dropped by an `as`). */
function parseFailedPages(value: unknown): CompilePageFailure[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((f): f is { slug: unknown; reason?: unknown } => !!f && typeof f === 'object')
    .map((f) => ({
      slug: typeof f.slug === 'string' ? f.slug : '',
      reason: typeof f.reason === 'string' ? f.reason : '',
    }))
    .filter((f) => f.slug.length > 0);
}

/**
 * Fires a one-time recompile, then polls brainState until READY or ~90s.
 * Reuses the proven {@code GET /avatars/{id}} brainState signal. Designed to run
 * NON-BLOCKING after uploads finish, so the uploader can return to idle and the
 * caller can drive a "Compiling… / Ready" chip from {@code onTick}.
 */
export async function recompileAndPollBrain(
  avatarId: string,
  onTick?: (state: CompileState) => void
): Promise<RecompileOutcome> {
  onTick?.('compiling');
  // recompile once for the batch (mobile fires per upload; recompile is idempotent)
  try {
    await api.recompile(avatarId);
  } catch {
    /* non-fatal — backend also schedules recompile after upload */
  }

  let brainReady = false;
  let wikiPageCount = 0;
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

  // A partial compile still reaches READY, so readiness alone can't reveal it —
  // read the per-page failures explicitly from compile-status. Best-effort: if the
  // status call fails, we degrade to "no known failures" rather than block the UI.
  let failedPages: CompilePageFailure[] = [];
  if (brainReady) {
    try {
      const status = await api.compileStatus(avatarId);
      failedPages = parseFailedPages(status.data.failedPages);
    } catch {
      /* status is advisory — absence must not turn success into an error */
    }
  }

  onTick?.(brainReady ? 'ready' : 'timeout');
  return { brainReady, wikiPageCount, failedPages };
}

/**
 * Poll-only variant for mutations the BACKEND already recompiles for — e.g. a
 * file delete fires a debounced recompile server-side, so firing another here
 * would be redundant. Two differences from recompileAndPollBrain:
 *  1. it never calls api.recompile (the server already did);
 *  2. readiness does NOT require wikiPageCount > 0 — deleting the last file
 *     legitimately drops the brain to 0 pages and must still resolve, not hang
 *     for the full ~90s cap.
 */
export async function pollBrainReady(
  avatarId: string,
  onTick?: (state: CompileState) => void
): Promise<RecompileOutcome> {
  onTick?.('compiling');
  let brainReady = false;
  let wikiPageCount = 0;
  for (let attempt = 0; attempt < 18; attempt++) {
    await sleep(5000);
    try {
      const a = await api.avatar(avatarId);
      wikiPageCount = a.data.wikiPageCount ?? 0;
      if ((a.data.brainState ?? 'READY') === 'READY') {
        brainReady = true;
        break;
      }
    } catch {
      /* transient — keep polling until the cap */
    }
  }
  onTick?.(brainReady ? 'ready' : 'timeout');
  // Delete-driven refresh: no compile this avatar initiated here, so no page
  // failures to report.
  return { brainReady, wikiPageCount, failedPages: [] };
}

export async function runUploadPipeline(
  avatarId: string,
  files: File[],
  onUpdate: (progress: FileProgress[]) => void,
  opts: { recompileAndPoll?: boolean } = {}
): Promise<PipelineResult> {
  // recompileAndPoll defaults true for back-compat. The uploader passes false so
  // the slow recompile/poll runs OUT of band (Bug #1 — upload no longer blocks).
  const { recompileAndPoll = true } = opts;
  const batch = files.slice(0, MAX_FILES);
  const progress: FileProgress[] = batch.map((f) => ({ name: f.name, stage: 'queued', file: f }));
  const emit = () => onUpdate([...progress]);
  emit();

  let anyUploaded = false;

  for (let i = 0; i < batch.length; i++) {
    const result = await uploadSingleFile(avatarId, batch[i], (p) => {
      progress[i] = p;
      emit();
    });
    if (result.stage === 'done' || result.stage === 'warning') {
      anyUploaded = true;
    }
  }

  let brainReady = false;
  let wikiPageCount = 0;
  if (anyUploaded && recompileAndPoll) {
    const outcome = await recompileAndPollBrain(avatarId);
    brainReady = outcome.brainReady;
    wikiPageCount = outcome.wikiPageCount;
  }

  return { files: progress, brainReady, wikiPageCount };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function friendlyError(err: unknown, fileName: string): string {
  if (err instanceof ApiError) {
    if (err.status === 413) return `"${fileName}" is too large (max 25MB).`;
    if (err.status === 415) return `"${fileName}" isn't a supported file type.`;
    if (err.status === 409) return `"${fileName}" is already in this Mochi's brain.`;
    if (err.status === 401) return 'Session expired — please sign in again.';
    if (err.retryable) return `Upload of "${fileName}" failed: ${err.userMessage}`;
    return err.userMessage;
  }
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('413')) return `"${fileName}" is too large (max 25MB).`;
  if (msg.includes('415')) return `"${fileName}" isn't a supported file type.`;
  if (msg.includes('409')) return `"${fileName}" is already in this Mochi's brain.`;
  if (msg.includes('401')) return 'Session expired — please sign in again.';
  return `Upload of "${fileName}" failed. Please try again.`;
}
