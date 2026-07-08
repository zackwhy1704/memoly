import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiError, api } from '@/lib/api';

/**
 * The correctness gap: statusToApiError read `code` only at the TOP level, but the
 * gate envelope nests {code, feature} under `data`, so a 402 fell through to a
 * generic "Unexpected error" — the picker had nothing to render its allowance-hit
 * state from. These pin the 402 → typed ApiError mapping (tested via a real api call).
 */
function mockFetch(status: number, body: object) {
  const bodyStr = JSON.stringify(body);
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(bodyStr),
    json: () => Promise.resolve(body),
    headers: new Headers(),
  } as unknown as Response));
}

beforeEach(() => {
  vi.stubGlobal('localStorage', {
    getItem: () => 'tok', setItem: () => {}, removeItem: () => {}, clear: () => {},
  });
});
afterEach(() => vi.unstubAllGlobals());

describe('402 CHUNK_COMPILE mapping', () => {
  it('maps a nested {data:{code,feature}} 402 to ApiError(402, CHUNK_COMPILE, not retryable)', async () => {
    mockFetch(402, {
      data: { code: 'UPGRADE_REQUIRED', feature: 'CHUNK_COMPILE' },
      error: 'Premium plan required to compile more chapters this month',
      status: 402,
    });

    await expect(api.compileChunk('av1', 'c1')).rejects.toMatchObject({
      status: 402,
      code: 'CHUNK_COMPILE', // the feature — the discriminator the picker checks
      retryable: false,
    });
  });

  it('still distinguishes an upload-cap 402 by its feature', async () => {
    mockFetch(402, {
      data: { code: 'UPGRADE_REQUIRED', feature: 'UPLOAD_DOC' },
      error: 'Premium plan required to upload more documents',
      status: 402,
    });
    const err = await api.chapters('av1').catch((e) => e as ApiError);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).code).toBe('UPLOAD_DOC');
  });
});
