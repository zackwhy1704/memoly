import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ApiError, apiFetch } from '@/lib/api';

// We need to test statusToApiError, but it's not exported directly.
// We test it indirectly through apiFetch which calls it on non-ok responses.

// ── Helper: mock fetch to return a given status + body ───────────────
function mockFetch(status: number, body: string | object = '', ok?: boolean) {
  const bodyStr = typeof body === 'object' ? JSON.stringify(body) : body;
  const response = {
    ok: ok ?? (status >= 200 && status < 300),
    status,
    statusText: `Status ${status}`,
    text: () => Promise.resolve(bodyStr),
    json: () => Promise.resolve(typeof body === 'object' ? body : JSON.parse(bodyStr || '{}')),
    headers: new Headers(),
  } as unknown as Response;
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
}

function mockFetchNetworkError() {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
}

// ── Mock localStorage ────────────────────────────────────────────────
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, val: string) => { store[key] = val; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((_i: number) => null),
  };
})();

// ── Mock window.location ─────────────────────────────────────────────
const locationMock = { href: '' };

beforeEach(() => {
  vi.stubGlobal('localStorage', localStorageMock);
  vi.stubGlobal('location', locationMock);
  localStorageMock.clear();
  locationMock.href = '';
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ── statusToApiError via apiFetch (non-ok responses) ─────────────────
describe('statusToApiError (via apiFetch)', () => {
  it('400 → status 400, not retryable', async () => {
    mockFetch(400, '{}');
    const err = await apiFetch('/test').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(400);
    expect(err.retryable).toBe(false);
    expect(err.userMessage).toContain('off with that request');
  });

  it('400 uses backend message when present', async () => {
    mockFetch(400, { error: 'Name is required.' });
    const err = await apiFetch('/test').catch((e) => e);
    expect(err.userMessage).toBe('Name is required.');
  });

  it('401 → clears localStorage token and redirects', async () => {
    localStorageMock.setItem('memoly_token', 'old-jwt');
    localStorageMock.setItem('memoly_user_id', 'user-1');
    mockFetch(401, '{}');

    const err = await apiFetch('/test').catch((e) => e);
    expect(err.status).toBe(401);
    expect(err.retryable).toBe(false);
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('memoly_token');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('memoly_user_id');
    expect(locationMock.href).toBe('/login');
  });

  it('403 → not retryable, access denied message', async () => {
    mockFetch(403, '{}');
    const err = await apiFetch('/test').catch((e) => e);
    expect(err.status).toBe(403);
    expect(err.retryable).toBe(false);
    expect(err.userMessage).toContain("don't have access");
  });

  it('404 → not retryable', async () => {
    mockFetch(404, '{}');
    const err = await apiFetch('/test').catch((e) => e);
    expect(err.status).toBe(404);
    expect(err.retryable).toBe(false);
    expect(err.userMessage).toContain('Not found');
  });

  it('413 → file too large, not retryable', async () => {
    mockFetch(413, '{}');
    const err = await apiFetch('/test').catch((e) => e);
    expect(err.status).toBe(413);
    expect(err.retryable).toBe(false);
    expect(err.userMessage).toContain('25MB');
  });

  it('429 → retryable', async () => {
    mockFetch(429, '{}');
    const err = await apiFetch('/test').catch((e) => e);
    expect(err.status).toBe(429);
    expect(err.retryable).toBe(true);
    expect(err.userMessage).toContain('Too many requests');
  });

  it('500 → retryable', async () => {
    mockFetch(500, '{}');
    const err = await apiFetch('/test').catch((e) => e);
    expect(err.status).toBe(500);
    expect(err.retryable).toBe(true);
    expect(err.userMessage).toContain('went wrong');
  });

  it('503 → retryable, service busy', async () => {
    mockFetch(503, '{}');
    const err = await apiFetch('/test').catch((e) => e);
    expect(err.status).toBe(503);
    expect(err.retryable).toBe(true);
    expect(err.userMessage).toContain('busy');
  });

  it('504 → retryable, timeout message', async () => {
    mockFetch(504, '{}');
    const err = await apiFetch('/test').catch((e) => e);
    expect(err.status).toBe(504);
    expect(err.retryable).toBe(true);
    expect(err.userMessage).toContain('taking longer');
  });
});

// ── Network error ────────────────────────────────────────────────────
describe('apiFetch network error', () => {
  it('fetch throws → ApiError with status=0, retryable=true, offline message', async () => {
    mockFetchNetworkError();
    const err = await apiFetch('/test').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(0);
    expect(err.retryable).toBe(true);
    expect(err.userMessage).toContain('offline');
    expect(err.code).toBe('NETWORK');
  });
});

// ── Auth header behavior ─────────────────────────────────────────────
describe('apiFetch auth header', () => {
  it('attaches Bearer token from localStorage', async () => {
    localStorageMock.setItem('memoly_token', 'my-jwt-token');
    mockFetch(200, { data: 'ok' });

    await apiFetch('/test');

    const fetchFn = vi.mocked(globalThis.fetch);
    const callHeaders = fetchFn.mock.calls[0][1]?.headers as Record<string, string>;
    expect(callHeaders['Authorization']).toBe('Bearer my-jwt-token');
  });

  it('skips auth header when skipAuth=true', async () => {
    localStorageMock.setItem('memoly_token', 'my-jwt-token');
    mockFetch(200, { data: 'ok' });

    await apiFetch('/auth/login', { skipAuth: true });

    const fetchFn = vi.mocked(globalThis.fetch);
    const callHeaders = fetchFn.mock.calls[0][1]?.headers as Record<string, string>;
    expect(callHeaders['Authorization']).toBeUndefined();
  });

  it('does not include Authorization when no token exists', async () => {
    mockFetch(200, { data: 'ok' });

    await apiFetch('/test');

    const fetchFn = vi.mocked(globalThis.fetch);
    const callHeaders = fetchFn.mock.calls[0][1]?.headers as Record<string, string>;
    expect(callHeaders['Authorization']).toBeUndefined();
  });
});

// ── Successful response ──────────────────────────────────────────────
describe('apiFetch success', () => {
  it('returns parsed JSON on 200', async () => {
    mockFetch(200, { data: { id: '123', name: 'Mochi' } });
    const result = await apiFetch<{ data: { id: string; name: string } }>('/test');
    expect(result.data.id).toBe('123');
    expect(result.data.name).toBe('Mochi');
  });
});

// ── ApiError class structure ─────────────────────────────────────────
describe('ApiError class', () => {
  it('has the correct name property', () => {
    const err = new ApiError(500, 'INTERNAL', 'Server error', true);
    expect(err.name).toBe('ApiError');
    expect(err.message).toBe('Server error');
    expect(err).toBeInstanceOf(Error);
  });

  it('stores all fields', () => {
    const err = new ApiError(429, 'RATE_LIMIT', 'Slow down', true);
    expect(err.status).toBe(429);
    expect(err.code).toBe('RATE_LIMIT');
    expect(err.userMessage).toBe('Slow down');
    expect(err.retryable).toBe(true);
  });
});
