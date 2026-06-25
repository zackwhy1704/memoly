import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  validateFile,
  runUploadPipeline,
  uploadSingleFile,
  pollBrainReady,
  MAX_FILE_BYTES,
  ALLOWED_EXT,
  MAX_FILES,
  type FileStage,
  type FileProgress,
} from '@/lib/upload-pipeline';

vi.mock('@/lib/api', () => ({
  ApiError: class ApiError extends Error {},
  api: {
    checkRelevance: vi.fn().mockResolvedValue({ data: { isRelevant: true } }),
    uploadFile: vi.fn().mockResolvedValue({ data: { id: 'f1', pageCount: 1 } }),
    recompile: vi.fn().mockResolvedValue({ data: {} }),
    avatar: vi.fn().mockResolvedValue({ data: { brainState: 'READY', wikiPageCount: 1 } }),
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
