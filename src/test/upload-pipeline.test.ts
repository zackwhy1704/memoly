import { describe, it, expect } from 'vitest';
import {
  validateFile,
  MAX_FILE_BYTES,
  ALLOWED_EXT,
  MAX_FILES,
  type FileStage,
  type FileProgress,
} from '@/lib/upload-pipeline';

// ── Helper: create a mock File ───────────────────────────────────────
function createFile(name: string, size: number): File {
  const content = new Uint8Array(size);
  return new File([content], name, { type: 'application/octet-stream' });
}

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
