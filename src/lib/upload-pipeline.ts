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

import { api, ApiError, type CompilePageFailure, type ChunkInfo } from '@/lib/api';

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
  | 'segmented' // large file split into pickable chapters — NOT compiled; show the picker
  | 'relevanceWarning' // SERVER rejected on the full text — terminal until the user decides
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
  /** Segmented upload: the parent file id + its pickable chapters (stage 'segmented'). */
  parentFileId?: string;
  chunks?: ChunkInfo[];
  /** SERVER relevance rejection (stage 'relevanceWarning'): the backend's reason
   *  string and 0-1 relevance score, from POST /files returning UploadResult.
   *  RelevanceWarning. Distinct from the CLIENT pre-check's lowRelevance/
   *  notStudyMaterial above — this is the full-text check the ~30-char sample
   *  can miss. */
  reason?: string;
  score?: number;
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
  onProgress: (p: FileProgress) => void,
  opts: { forceSkipRelevance?: boolean } = {}
): Promise<FileProgress> {
  const invalid = validateFile(file);
  if (invalid) {
    const p: FileProgress = { name: file.name, stage: 'error', message: invalid, file };
    onProgress(p);
    return p;
  }

  let skipRelevance = false;
  let lowRelevance = false;
  let notStudyMaterial = false;

  if (opts.forceSkipRelevance) {
    // "Add Anyway" from the server RelevanceWarning dialog — the user already
    // confirmed on the FULL-text rejection, so the client's ~30-char pre-check
    // would be redundant (and could only disagree, never overrule the user's
    // choice). Go straight to upload with skipRelevance:true.
    skipRelevance = true;
  } else {
    // Relevance check (fail-open)
    onProgress({ name: file.name, stage: 'checkingRelevance', file });
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
  }

  // Upload
  onProgress({ name: file.name, stage: 'uploading', file });
  try {
    const res = await api.uploadFile(avatarId, file, { skipRelevance });

    // SERVER relevance rejection: the backend ran its own check on the FULL
    // extracted text (the client pre-check above only samples ~30 chars, so it
    // can pass while the server still rejects — this is expected, not a bug).
    // POST /files returns HTTP 200 with UploadResult.RelevanceWarning, which has
    // NO type-discriminator field on the wire (Jackson serializes it flat under
    // ApiResponse.data). Detect it structurally: RelevanceWarning is the ONLY
    // variant with a numeric top-level `score` alongside a string `reason`; both
    // Success (has `pageCount`) and Segmented (has `chunks`) lack this pair.
    // Must run BEFORE the segmented/quality/done logic below, since without this
    // check a RelevanceWarning body (no chunks, no quality) would fall through to
    // 'done' — silently reporting a server-rejected file as a successful upload.
    const maybeWarning = res.data as { score?: unknown; reason?: unknown; fileId?: unknown } | undefined;
    if (typeof maybeWarning?.score === 'number' && typeof maybeWarning?.reason === 'string') {
      const warning: FileProgress = {
        name: file.name,
        stage: 'relevanceWarning',
        file,
        reason: maybeWarning.reason,
        score: maybeWarning.score,
        fileId: typeof maybeWarning.fileId === 'string' ? maybeWarning.fileId : undefined,
      };
      onProgress(warning);
      return warning;
    }

    // Segmented upload (EARLY / upload-time segmentation): a large file was split
    // into pickable chapters in the upload response and NOT compiled. Surface the
    // chunks so MochiUploader opens the picker instead of the compile watch.
    //
    // NOTE: this covers ONLY files the backend segments at upload time. A file
    // segmented LATE (during compile) can't carry chunks here — the upload response
    // is long gone by the time compile decides to split it. That awaiting-selection
    // signal therefore arrives on the avatar-GET POLL (awaitingChapterSelection /
    // pendingChapterCount), NOT on this upload response. See recompileAndPollBrain.
    if (Array.isArray(res.data?.chunks) && res.data.chunks.length > 0) {
      const segmented: FileProgress = {
        name: file.name,
        stage: 'segmented',
        file,
        parentFileId: res.data.parentFileId,
        chunks: res.data.chunks,
        message: `Split into ${res.data.chunks.length} chapters — pick which to compile.`,
      };
      onProgress(segmented);
      return segmented;
    }

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
export type CompileState =
  | 'compiling'
  | 'ready'
  | 'timeout'
  | 'failed'            // compile errored — an HONEST terminal, distinct from timeout
  | 'awaiting-selection'; // compile-time segmentation — the teacher must pick chapters
export interface RecompileOutcome {
  brainReady: boolean;
  wikiPageCount: number;
  /** Pages the (re)compile could NOT persist. A partial compile still reaches
   *  brainState READY, so this is the only honest signal that the brain is
   *  incomplete. Empty on full success. */
  failedPages: CompilePageFailure[];
  /** Compile-time segmentation: the file was split DURING compile (not at upload),
   *  so the awaiting-selection signal arrives on the avatar-GET poll — never on the
   *  upload response. The teacher must pick chapters before compile can finish. */
  awaitingChapterSelection?: boolean;
  pendingChapterCount?: number;
  /** Honest failure reason from api.recompile() throwing OR the avatar-GET poll's
   *  compileFailureReason. Present ⇒ compile did NOT succeed; render an honest
   *  failure, never the soft "still compiling… shortly". */
  compileFailureReason?: string | null;
  /** Machine-readable cause paired with compileFailureReason (backend compileFailureKind):
   *  'IRRELEVANT' | 'FAILED' | 'MIXED' | null. Lets the UI pick the recovery affordance —
   *  Recompile is a dead end for IRRELEVANT (re-upload instead). */
  compileFailureKind?: string | null;
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
  let brainReady = false;
  let wikiPageCount = 0;
  let awaitingChapterSelection = false;
  let pendingChapterCount = 0;
  let compileFailureReason: string | null = null;
  let compileFailureKind: string | null = null;

  // recompile once for the batch (mobile fires per upload; recompile is idempotent)
  try {
    await api.recompile(avatarId);
  } catch (err) {
    // Un-swallowed (was an empty catch): a recompile that never STARTED can't
    // complete, so silently polling for ~90s then soft-timing-out is dishonest.
    // Capture the reason and surface an honest failure to the caller.
    compileFailureReason = err instanceof ApiError ? err.userMessage : 'Could not start compiling. Please try again.';
  }

  if (!compileFailureReason) {
    for (let attempt = 0; attempt < 18; attempt++) {
      await sleep(5000);
      try {
        const a = await api.avatar(avatarId);
        wikiPageCount = a.data.wikiPageCount ?? 0;
        // Honest failure recorded by the backend — terminal.
        if (a.data.compileFailureReason) {
          compileFailureReason = a.data.compileFailureReason;
          compileFailureKind = a.data.compileFailureKind ?? null;
          break;
        }
        // Compile-time segmentation — the file was split during compile, so no
        // chunks rode the upload response; the picker signal arrives HERE.
        if (a.data.awaitingChapterSelection === true) {
          awaitingChapterSelection = true;
          pendingChapterCount = a.data.pendingChapterCount ?? 0;
          break;
        }
        if ((a.data.brainState ?? 'READY') === 'READY' && wikiPageCount > 0) {
          brainReady = true;
          break;
        }
      } catch {
        /* transient — keep polling until the cap */
      }
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

  onTick?.(resolveCompileState({ brainReady, awaitingChapterSelection, compileFailureReason }));
  return { brainReady, wikiPageCount, failedPages, awaitingChapterSelection, pendingChapterCount, compileFailureReason, compileFailureKind };
}

/** Maps a resolved poll outcome to the single terminal CompileState the UI chip
 *  reads. Priority: failure > awaiting-selection > ready > timeout (still polling
 *  hit the cap). Kept pure + shared so both poll variants tick identically. */
function resolveCompileState(o: {
  brainReady: boolean;
  awaitingChapterSelection: boolean;
  compileFailureReason: string | null;
}): CompileState {
  if (o.compileFailureReason) return 'failed';
  if (o.awaitingChapterSelection) return 'awaiting-selection';
  if (o.brainReady) return 'ready';
  return 'timeout';
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
  let awaitingChapterSelection = false;
  let pendingChapterCount = 0;
  let compileFailureReason: string | null = null;
  let compileFailureKind: string | null = null;
  for (let attempt = 0; attempt < 18; attempt++) {
    await sleep(5000);
    try {
      const a = await api.avatar(avatarId);
      wikiPageCount = a.data.wikiPageCount ?? 0;
      if (a.data.compileFailureReason) {
        compileFailureReason = a.data.compileFailureReason;
        compileFailureKind = a.data.compileFailureKind ?? null;
        break;
      }
      if (a.data.awaitingChapterSelection === true) {
        awaitingChapterSelection = true;
        pendingChapterCount = a.data.pendingChapterCount ?? 0;
        break;
      }
      if ((a.data.brainState ?? 'READY') === 'READY') {
        brainReady = true;
        break;
      }
    } catch {
      /* transient — keep polling until the cap */
    }
  }
  onTick?.(resolveCompileState({ brainReady, awaitingChapterSelection, compileFailureReason }));
  // Delete-driven refresh: no compile this avatar initiated here, so no page
  // failures to report.
  return { brainReady, wikiPageCount, failedPages: [], awaitingChapterSelection, pendingChapterCount, compileFailureReason, compileFailureKind };
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
    // Reflect an honest compile terminal onto the uploaded files (these per-file
    // stages were defined but never set). Only the SYNCHRONOUS path lands here; the
    // uploader compiles out-of-band and surfaces the batch state via the status chip.
    if (!brainReady && !outcome.awaitingChapterSelection) {
      const stage: FileStage = outcome.compileFailureReason ? 'compileFailed' : 'compileTimeout';
      const message = outcome.compileFailureReason
        ? `Compiling failed: ${outcome.compileFailureReason}`
        : 'Still compiling in the background — this can take a minute for large uploads.';
      for (let i = 0; i < progress.length; i++) {
        if (progress[i].stage === 'done' || progress[i].stage === 'warning') {
          progress[i] = { ...progress[i], stage, message };
        }
      }
      emit();
    }
  }

  return { files: progress, brainReady, wikiPageCount };
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Single source of truth for the upload/compile status message ───────────────
// Four surfaces used to each render their OWN independent string (the compile
// chip, the result panel, the per-file line, and the wizard hint), so a stale
// "still compiling…" could sit over a green ✓, or "upload at least one file" over
// a done file. deriveUploadStatus collapses the file/compile/awaiting state into
// exactly ONE authoritative status; every surface renders from THIS value, so two
// contradictory messages can never be visible at once.

export type UploadStatusKind =
  | 'uploading'
  | 'compiling'
  | 'awaiting-selection'
  | 'ready'
  | 'failed'
  | 'timeout'
  | 'empty';

export interface UploadStatus {
  kind: UploadStatusKind;
  message: string;
}

export interface UploadStatusState {
  files: FileProgress[];
  running: boolean;
  compileState: CompileState | 'idle';
  wikiPageCount: number;
  failedPages: CompilePageFailure[];
  awaitingChapterSelection?: boolean;
  pendingChapterCount?: number;
  compileFailureReason?: string | null;
}

const IN_FLIGHT_STAGES: FileStage[] = ['queued', 'checkingRelevance', 'uploading'];

/** Pure. Returns the ONE authoritative status for the current upload/compile
 *  state. Priority is deliberate: an honest failure and awaiting-selection
 *  outrank the soft "compiling" states so a real problem is never masked. */
export function deriveUploadStatus(s: UploadStatusState): UploadStatus {
  const uploaded = s.files.filter((f) => f.stage === 'done' || f.stage === 'warning');
  const hasSegmented = s.files.some((f) => f.stage === 'segmented');
  const inFlight = s.running || s.files.some((f) => IN_FLIGHT_STAGES.includes(f.stage));

  // 1. Honest failure — highest priority. Distinct copy from the soft "shortly".
  // ONE owner composes the final string. The backend reason is a complete sentence
  // ending in a period (AvatarMapper) — strip its trailing sentence punctuation
  // before appending our suffix, so we never emit "…PDF.. Your files are saved".
  if (s.compileFailureReason || s.compileState === 'failed') {
    const reason = s.compileFailureReason?.trim().replace(/[.!?\s]+$/, '');
    return {
      kind: 'failed',
      message: reason
        ? `Compiling failed: ${reason}. Your files are saved — try recompiling.`
        : 'Compiling failed. Your files are saved — try recompiling.',
    };
  }

  // 2. Awaiting chapter selection — from upload-time OR compile-time segmentation.
  if (s.awaitingChapterSelection || s.compileState === 'awaiting-selection' || hasSegmented) {
    const n = s.pendingChapterCount && s.pendingChapterCount > 0 ? s.pendingChapterCount : null;
    return {
      kind: 'awaiting-selection',
      message: n ? `${n} chapters ready to pick.` : 'Chapters ready to pick.',
    };
  }

  // 3. Files still uploading.
  if (inFlight) {
    return { kind: 'uploading', message: 'Uploading your files…' };
  }

  // 4. Compile in progress.
  if (s.compileState === 'compiling') {
    return { kind: 'compiling', message: 'Content still compiling — modules will appear shortly.' };
  }

  // 5. Compile finished (READY). Partial ⇒ honest "X of Y"; clean ⇒ success.
  if (s.compileState === 'ready') {
    if (s.failedPages.length > 0) {
      const total = s.wikiPageCount + s.failedPages.length;
      return {
        kind: 'ready',
        message: `⚠ ${s.wikiPageCount} of ${total} pages compiled — ${s.failedPages.length} failed. Recompile to complete the brain.`,
      };
    }
    return {
      kind: 'ready',
      message: `✓ Notes compiled — ${s.wikiPageCount} page${s.wikiPageCount === 1 ? '' : 's'} ready.`,
    };
  }

  // 6. Compile timed out — honest but soft (the backend may still finish).
  if (s.compileState === 'timeout') {
    return { kind: 'timeout', message: 'Still compiling — modules will appear here shortly.' };
  }

  // 7. Uploaded but the compile watch hasn't ticked yet (brief window) — compiling.
  if (uploaded.length > 0) {
    return { kind: 'compiling', message: 'Content still compiling — modules will appear shortly.' };
  }

  // 8. Nothing uploaded yet.
  return { kind: 'empty', message: 'Upload at least one file so Mochi has something to teach.' };
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
