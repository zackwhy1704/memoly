import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  validateFile,
  runUploadPipeline,
  uploadSingleFile,
  pollBrainReady,
  recompileAndPollBrain,
  deriveUploadStatus,
  MAX_FILE_BYTES,
  ALLOWED_EXT,
  MAX_FILES,
  type FileStage,
  type FileProgress,
  type UploadStatusState,
} from '@/lib/upload-pipeline';

vi.mock('@/lib/api', () => ({
  ApiError: class ApiError extends Error {},
  api: {
    checkRelevance: vi.fn().mockResolvedValue({ data: { isRelevant: true } }),
    uploadFile: vi.fn().mockResolvedValue({ data: { id: 'f1', pageCount: 1 } }),
    recompile: vi.fn().mockResolvedValue({ data: {} }),
    avatar: vi.fn().mockResolvedValue({ data: { brainState: 'READY', wikiPageCount: 1 } }),
    compileStatus: vi.fn().mockResolvedValue({ data: { state: 'DONE', failedPages: [] } }),
  },
}));

import { api } from '@/lib/api';

// ── Bug #1: non-blocking upload ──────────────────────────────────────
describe('runUploadPipeline recompileAndPoll option', () => {
  beforeEach(() => vi.clearAllMocks());

  it('recompileAndPoll:false uploads WITHOUT triggering recompile or the brain poll', async () => {
    const file = new File([new Uint8Array(1024)], 'notes.pdf', { type: 'application/pdf' });
    const result = await runUploadPipeline('av1', [file], () => {}, { recompileAndPoll: false });

    expect(api.uploadFile).toHaveBeenCalledTimes(1); // upload still happens
    expect(api.recompile).not.toHaveBeenCalled();     // …but compile is deferred
    expect(api.avatar).not.toHaveBeenCalled();        // …and we never block-poll
    expect(result.brainReady).toBe(false);
  });
});

// ── Helper: create a mock File ───────────────────────────────────────
function createFile(name: string, size: number): File {
  const content = new Uint8Array(size);
  return new File([content], name, { type: 'application/octet-stream' });
}

// ── A2: "is this study material?" gate ───────────────────────────────
// The relevance check returns two distinct signals: isRelevant (off-topic for
// THIS class) and studyMaterial (a receipt/selfie/blank — not notes at all).
// Either one must still upload (fail-open) but land the file in a "warning"
// stage with the right copy, never silently drop it or hard-error.
describe('uploadSingleFile — relevance / study-material gate (A2)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('studyMaterial:false → warning stage with the "not study material" message, still uploaded', async () => {
    vi.mocked(api.checkRelevance).mockResolvedValueOnce({
      data: { isRelevant: true, studyMaterial: false },
    } as Awaited<ReturnType<typeof api.checkRelevance>>);
    const file = createFile('receipt.png', 2048);

    const result = await uploadSingleFile('av1', file, () => {});

    expect(api.uploadFile).toHaveBeenCalledTimes(1); // fail-open: still uploaded
    expect(api.uploadFile).toHaveBeenCalledWith('av1', file, { skipRelevance: true });
    expect(result.stage).toBe('warning');
    expect(result.notStudyMaterial).toBe(true);
    expect(result.message).toContain("doesn't look like study material");
  });

  it('isRelevant:false (off-topic) → warning stage with the "off-topic" message', async () => {
    vi.mocked(api.checkRelevance).mockResolvedValueOnce({
      data: { isRelevant: false, studyMaterial: true },
    } as Awaited<ReturnType<typeof api.checkRelevance>>);
    const file = createFile('biology-notes.pdf', 2048);

    const result = await uploadSingleFile('av1', file, () => {});

    expect(result.stage).toBe('warning');
    expect(result.lowRelevance).toBe(true);
    expect(result.notStudyMaterial).toBeFalsy();
    expect(result.message).toContain('off-topic');
  });

  it('relevant study material → done stage, no warning flags', async () => {
    vi.mocked(api.checkRelevance).mockResolvedValueOnce({
      data: { isRelevant: true, studyMaterial: true },
    } as Awaited<ReturnType<typeof api.checkRelevance>>);
    const file = createFile('chapter-3.pdf', 2048);

    const result = await uploadSingleFile('av1', file, () => {});

    expect(result.stage).toBe('done');
    expect(result.lowRelevance).toBeFalsy();
    expect(result.notStudyMaterial).toBeFalsy();
  });

  it('relevance check throwing → fails open (skipRelevance, file still uploads)', async () => {
    vi.mocked(api.checkRelevance).mockRejectedValueOnce(new Error('relevance service down'));
    const file = createFile('notes.pdf', 2048);

    const result = await uploadSingleFile('av1', file, () => {});

    expect(api.uploadFile).toHaveBeenCalledWith('av1', file, { skipRelevance: true });
    expect(result.stage).toBe('done'); // no relevance signal ⇒ not flagged
  });
});

// ── validateFile ─────────────────────────────────────────────────────
describe('validateFile', () => {
  it('returns error for empty file (0 bytes)', () => {
    const file = createFile('empty.pdf', 0);
    const result = validateFile(file);
    expect(result).not.toBeNull();
    expect(result).toContain('empty');
  });

  it('returns error for file exceeding 25MB', () => {
    const file = createFile('huge.pdf', MAX_FILE_BYTES + 1);
    const result = validateFile(file);
    expect(result).not.toBeNull();
    expect(result).toContain('25MB');
    // Should include file size in MB
    expect(result).toMatch(/\d+\.\d+MB/);
  });

  it('returns error for .exe file (unsupported extension)', () => {
    const file = createFile('virus.exe', 1024);
    const result = validateFile(file);
    expect(result).not.toBeNull();
    expect(result).toContain('.exe');
    expect(result).toContain('supported');
  });

  it('returns error for .zip file (unsupported extension)', () => {
    const file = createFile('archive.zip', 1024);
    const result = validateFile(file);
    expect(result).not.toBeNull();
    expect(result).toContain('.zip');
    expect(result).toContain('supported');
  });

  it('returns null for valid .pdf file', () => {
    const file = createFile('notes.pdf', 1024);
    expect(validateFile(file)).toBeNull();
  });

  it('returns null for valid .jpg file', () => {
    const file = createFile('photo.jpg', 2048);
    expect(validateFile(file)).toBeNull();
  });

  it('returns null for valid .png file', () => {
    const file = createFile('screenshot.png', 4096);
    expect(validateFile(file)).toBeNull();
  });

  it('returns null for valid .txt file', () => {
    const file = createFile('notes.txt', 512);
    expect(validateFile(file)).toBeNull();
  });

  it('returns null for valid .heic file', () => {
    const file = createFile('photo.heic', 3000);
    expect(validateFile(file)).toBeNull();
  });

  it('returns null for valid .webp file', () => {
    const file = createFile('image.webp', 3000);
    expect(validateFile(file)).toBeNull();
  });

  it('returns null for file exactly at the 25MB limit', () => {
    const file = createFile('big.pdf', MAX_FILE_BYTES);
    expect(validateFile(file)).toBeNull();
  });
});

// ── Constants ────────────────────────────────────────────────────────
describe('upload-pipeline constants', () => {
  it('MAX_FILES is 10', () => {
    expect(MAX_FILES).toBe(10);
  });

  it('MAX_FILE_BYTES is 25MB', () => {
    expect(MAX_FILE_BYTES).toBe(25 * 1024 * 1024);
  });

  it('ALLOWED_EXT includes expected extensions', () => {
    expect(ALLOWED_EXT).toContain('pdf');
    expect(ALLOWED_EXT).toContain('jpg');
    expect(ALLOWED_EXT).toContain('jpeg');
    expect(ALLOWED_EXT).toContain('png');
    expect(ALLOWED_EXT).toContain('txt');
    expect(ALLOWED_EXT).toContain('heic');
    expect(ALLOWED_EXT).toContain('webp');
  });
});

// ── FileStage type usage ─────────────────────────────────────────────
describe('FileStage type', () => {
  it('all expected stages are assignable', () => {
    const stages: FileStage[] = [
      'queued',
      'checkingRelevance',
      'uploading',
      'done',
      'warning',
      'error',
      'compiling',
      'compileTimeout',
      'compileFailed',
    ];
    expect(stages).toHaveLength(9);
  });

  it('FileProgress can be constructed with all fields', () => {
    const fp: FileProgress = {
      name: 'test.pdf',
      stage: 'done',
      message: 'Uploaded successfully',
      pageCount: 3,
      lowRelevance: false,
      servedBy: 'primary',
      degraded: false,
    };
    expect(fp.name).toBe('test.pdf');
    expect(fp.stage).toBe('done');
    expect(fp.pageCount).toBe(3);
  });

  it('FileProgress can be constructed with minimal fields', () => {
    const fp: FileProgress = { name: 'test.pdf', stage: 'queued' };
    expect(fp.name).toBe('test.pdf');
    expect(fp.stage).toBe('queued');
    expect(fp.message).toBeUndefined();
  });
});

// ── recompileAndPollBrain — surfaces PARTIAL compile failures (Phase 1/2) ─
// A partial compile still reaches brainState READY, so readiness can't reveal it.
// recompileAndPollBrain must read GET /wiki/compile/status and return failedPages.
describe('recompileAndPollBrain — partial-compile failures', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.useRealTimers());

  async function run() {
    vi.mocked(api.avatar).mockResolvedValue({
      data: { brainState: 'READY', wikiPageCount: 6 },
    } as Awaited<ReturnType<typeof api.avatar>>);
    vi.useFakeTimers();
    const p = recompileAndPollBrain('av1');
    await vi.advanceTimersByTimeAsync(5000);
    return p;
  }

  it('returns failedPages from compile-status when the brain is incomplete', async () => {
    vi.mocked(api.compileStatus).mockResolvedValue({
      data: {
        state: 'DONE',
        pagesCompiled: 6,
        pagesTotal: 8,
        pagesFailed: 2,
        failedPages: [
          { slug: 'osmosis', reason: 'DataIntegrity: conflict_note' },
          { slug: 'mitosis', reason: 'boom' },
        ],
      },
    } as Awaited<ReturnType<typeof api.compileStatus>>);

    const result = await run();

    expect(api.compileStatus).toHaveBeenCalledWith('av1');
    expect(result.brainReady).toBe(true);
    expect(result.failedPages).toHaveLength(2);
    expect(result.failedPages.map((f) => f.slug)).toEqual(['osmosis', 'mitosis']);
  });

  it('returns empty failedPages on a clean compile', async () => {
    vi.mocked(api.compileStatus).mockResolvedValue({
      data: { state: 'DONE', pagesCompiled: 6, pagesTotal: 6, failedPages: [] },
    } as Awaited<ReturnType<typeof api.compileStatus>>);

    const result = await run();

    expect(result.failedPages).toEqual([]);
  });

  it('degrades to empty failedPages (not an error) when compile-status is unavailable', async () => {
    vi.mocked(api.compileStatus).mockRejectedValue(new Error('status 500'));

    const result = await run();

    expect(result.brainReady).toBe(true); // readiness must NOT be blocked by status
    expect(result.failedPages).toEqual([]);
  });

  it('coerces malformed failedPages entries away at the boundary', async () => {
    vi.mocked(api.compileStatus).mockResolvedValue({
      // junk shapes: missing slug, non-object — must be filtered, not crash
      data: { state: 'DONE', failedPages: [{ reason: 'no slug' }, null, { slug: 'real', reason: 'x' }] },
    } as unknown as Awaited<ReturnType<typeof api.compileStatus>>);

    const result = await run();

    expect(result.failedPages).toEqual([{ slug: 'real', reason: 'x' }]);
  });
});

// ── recompileAndPollBrain — compile-time segmentation surfaces on the POLL ─
// A file segmented DURING compile can't carry chunks on its (long-gone) upload
// response — the awaiting-selection signal arrives on GET /avatars/{id}. Before
// the fix the poll read only brainState/wikiPageCount, so this state was invisible
// and the watch soft-timed-out after ~90s instead of telling the teacher to pick.
describe('recompileAndPollBrain — compile-time segmentation (awaiting-selection)', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.useRealTimers());

  it('resolves AWAITING-SELECTION with the pending chapter count from the poll', async () => {
    vi.mocked(api.avatar).mockResolvedValue({
      data: {
        brainState: 'PENDING_RECOMPILE',
        wikiPageCount: 0,
        awaitingChapterSelection: true,
        pendingChapterCount: 3,
      },
    } as Awaited<ReturnType<typeof api.avatar>>);
    vi.useFakeTimers();
    const ticks: string[] = [];

    const p = recompileAndPollBrain('av1', (s) => ticks.push(s));
    await vi.advanceTimersByTimeAsync(5000);
    const result = await p;

    expect(result.brainReady).toBe(false);
    expect(result.awaitingChapterSelection).toBe(true);
    expect(result.pendingChapterCount).toBe(3);
    // NOT a soft timeout — the terminal tick is the honest awaiting-selection state.
    expect(ticks.at(-1)).toBe('awaiting-selection');
    // Partial-failure lookup must be skipped (brain never reached READY).
    expect(api.compileStatus).not.toHaveBeenCalled();
  });
});

// ── recompileAndPollBrain — honest compile FAILURE (no more soft "shortly") ─
describe('recompileAndPollBrain — honest failure', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.useRealTimers());

  it('resolves FAILED carrying the poll compileFailureReason', async () => {
    vi.mocked(api.avatar).mockResolvedValue({
      data: {
        brainState: 'PENDING_RECOMPILE',
        wikiPageCount: 0,
        compileFailureReason: 'Compile crashed on page 4 (unreadable scan).',
      },
    } as Awaited<ReturnType<typeof api.avatar>>);
    vi.useFakeTimers();
    const ticks: string[] = [];

    const p = recompileAndPollBrain('av1', (s) => ticks.push(s));
    await vi.advanceTimersByTimeAsync(5000);
    const result = await p;

    expect(result.brainReady).toBe(false);
    expect(result.compileFailureReason).toBe('Compile crashed on page 4 (unreadable scan).');
    expect(ticks.at(-1)).toBe('failed'); // honest terminal, not 'timeout'
  });

  it('surfaces a FAILED reason when the recompile call itself throws (un-swallowed)', async () => {
    const { ApiError } = await import('@/lib/api');
    // Real ApiError takes (status, code, userMessage, retryable); the mocked class
    // ignores them, so we also set userMessage explicitly for the instanceof branch.
    vi.mocked(api.recompile).mockRejectedValueOnce(
      Object.assign(new ApiError(500, null, 'Server is busy — try again.', false), {
        userMessage: 'Server is busy — try again.',
      })
    );
    vi.useFakeTimers();
    const ticks: string[] = [];

    const p = recompileAndPollBrain('av1', (s) => ticks.push(s));
    await vi.runAllTimersAsync();
    const result = await p;

    expect(result.compileFailureReason).toBe('Server is busy — try again.');
    expect(ticks.at(-1)).toBe('failed');
    // A recompile that never STARTED must not then poll for ~90s.
    expect(api.avatar).not.toHaveBeenCalled();
  });
});

// ── deriveUploadStatus — the ONE status owner ────────────────────────────────
// Four surfaces used to each render their own string; this pure reducer collapses
// them to exactly one. The invariant: never two contradictory messages — a
// done-file that's compiling must NEVER also read "upload at least one file".
describe('deriveUploadStatus — single status owner', () => {
  const base: UploadStatusState = {
    files: [],
    running: false,
    compileState: 'idle',
    wikiPageCount: 0,
    failedPages: [],
  };

  it('a done file while compiling → exactly "compiling", NOT the empty prompt', () => {
    const s = deriveUploadStatus({
      ...base,
      files: [{ name: 'a.pdf', stage: 'done' }],
      compileState: 'compiling',
    });
    expect(s.kind).toBe('compiling');
    expect(s.message).not.toMatch(/upload at least one file/i);
  });

  it('nothing uploaded → empty prompt', () => {
    expect(deriveUploadStatus(base).kind).toBe('empty');
    expect(deriveUploadStatus(base).message).toMatch(/upload at least one file/i);
  });

  it('a compile failure reason outranks everything → failed with the reason', () => {
    const s = deriveUploadStatus({
      ...base,
      files: [{ name: 'a.pdf', stage: 'done' }],
      compileState: 'ready', // even a "ready" tick must not mask a real failure
      compileFailureReason: 'disk full',
    });
    expect(s.kind).toBe('failed');
    expect(s.message).toContain('disk full');
  });

  it('awaiting chapter selection → awaiting-selection with the count', () => {
    const s = deriveUploadStatus({
      ...base,
      files: [{ name: 'book.pdf', stage: 'done' }],
      awaitingChapterSelection: true,
      pendingChapterCount: 4,
    });
    expect(s.kind).toBe('awaiting-selection');
    expect(s.message).toContain('4');
  });

  it('clean READY compile → single ready success line', () => {
    const s = deriveUploadStatus({
      ...base,
      files: [{ name: 'a.pdf', stage: 'done' }],
      compileState: 'ready',
      wikiPageCount: 5,
    });
    expect(s.kind).toBe('ready');
    expect(s.message).toMatch(/5 pages ready/);
  });
});

// ── pollBrainReady — post-delete brain refresh (does NOT re-recompile) ─
describe('pollBrainReady', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => vi.useRealTimers());

  it('never fires its own recompile (the backend already did on delete)', async () => {
    vi.mocked(api.avatar).mockResolvedValue({ data: { brainState: 'READY', wikiPageCount: 3 } } as Awaited<ReturnType<typeof api.avatar>>);
    vi.useFakeTimers();

    const p = pollBrainReady('av1');
    await vi.advanceTimersByTimeAsync(5000);
    const result = await p;

    expect(api.recompile).not.toHaveBeenCalled();
    expect(result.brainReady).toBe(true);
  });

  it('resolves ready on brainState READY even with 0 pages (last file deleted)', async () => {
    // The crux: deleting the last file legitimately drops the brain to 0 pages.
    // Readiness must NOT require pages > 0, or the chip would hang for ~90s.
    vi.mocked(api.avatar).mockResolvedValue({ data: { brainState: 'READY', wikiPageCount: 0 } } as Awaited<ReturnType<typeof api.avatar>>);
    vi.useFakeTimers();

    const p = pollBrainReady('av1');
    await vi.advanceTimersByTimeAsync(5000);
    const result = await p;

    expect(result.brainReady).toBe(true);
    expect(result.wikiPageCount).toBe(0);
  });

  it('emits compiling → ready ticks for the UI chip', async () => {
    vi.mocked(api.avatar).mockResolvedValue({ data: { brainState: 'READY', wikiPageCount: 1 } } as Awaited<ReturnType<typeof api.avatar>>);
    vi.useFakeTimers();
    const ticks: string[] = [];

    const p = pollBrainReady('av1', (s) => ticks.push(s));
    await vi.advanceTimersByTimeAsync(5000);
    await p;

    expect(ticks[0]).toBe('compiling');
    expect(ticks.at(-1)).toBe('ready');
  });
});

// ── Chapter-chunking: segmented upload surfaces the chunks ───────────
describe('uploadSingleFile — segmented (large) upload', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns stage=segmented with the chunks instead of compiling', async () => {
    vi.mocked(api.checkRelevance).mockResolvedValue({ data: { isRelevant: true } } as never);
    vi.mocked(api.uploadFile).mockResolvedValue({
      data: {
        parentFileId: 'p1',
        chunks: [
          { chunkId: 'c1', title: 'Ch 1', pageFrom: 1, pageTo: 25, pageCount: 25 },
          { chunkId: 'c2', title: 'Ch 2', pageFrom: 26, pageTo: 50, pageCount: 25 },
        ],
      },
    } as never);

    const file = new File(['x'], 'book.pdf', { type: 'application/pdf' });
    const res = await uploadSingleFile('av1', file, () => {});

    expect(res.stage).toBe('segmented');
    expect(res.parentFileId).toBe('p1');
    expect(res.chunks).toHaveLength(2);
  });
});
