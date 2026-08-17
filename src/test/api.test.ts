import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ApiError,
  apiFetch,
  api,
  asArray,
  toDueInstant,
  type ClassModule,
  type ConceptMasteryData,
  type NarrationData,
  type AssignmentSummary,
  type AssignmentDetail,
  type ReviewItem,
  type ExamReadiness,
  type MuddiestPoint,
  type Challenge,
  type CreateChallengeBody,
  type ClassroomSessionState,
} from '@/lib/api';

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
    const err = await apiFetch('/test').catch((e: unknown) => e as ApiError) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.status).toBe(400);
    expect(err.retryable).toBe(false);
    expect(err.userMessage).toContain('off with that request');
  });

  it('400 uses backend message when present', async () => {
    mockFetch(400, { error: 'Name is required.' });
    const err = await apiFetch('/test').catch((e: unknown) => e as ApiError) as ApiError;
    expect(err.userMessage).toBe('Name is required.');
  });

  it('401 → clears localStorage token and redirects', async () => {
    localStorageMock.setItem('memoly_token', 'old-jwt');
    localStorageMock.setItem('memoly_user_id', 'user-1');
    mockFetch(401, '{}');

    const err = await apiFetch('/test').catch((e: unknown) => e as ApiError) as ApiError;
    expect(err.status).toBe(401);
    expect(err.retryable).toBe(false);
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('memoly_token');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('memoly_user_id');
    expect(locationMock.href).toBe('/login');
  });

  it('403 → not retryable, access denied message', async () => {
    mockFetch(403, '{}');
    const err = await apiFetch('/test').catch((e: unknown) => e as ApiError) as ApiError;
    expect(err.status).toBe(403);
    expect(err.retryable).toBe(false);
    expect(err.userMessage).toContain("don't have access");
  });

  it('404 → not retryable', async () => {
    mockFetch(404, '{}');
    const err = await apiFetch('/test').catch((e: unknown) => e as ApiError) as ApiError;
    expect(err.status).toBe(404);
    expect(err.retryable).toBe(false);
    expect(err.userMessage).toContain('Not found');
  });

  it('413 → file too large, not retryable', async () => {
    mockFetch(413, '{}');
    const err = await apiFetch('/test').catch((e: unknown) => e as ApiError) as ApiError;
    expect(err.status).toBe(413);
    expect(err.retryable).toBe(false);
    expect(err.userMessage).toContain('25MB');
  });

  it('429 → retryable', async () => {
    mockFetch(429, '{}');
    const err = await apiFetch('/test').catch((e: unknown) => e as ApiError) as ApiError;
    expect(err.status).toBe(429);
    expect(err.retryable).toBe(true);
    expect(err.userMessage).toContain('Too many requests');
  });

  it('500 → retryable', async () => {
    mockFetch(500, '{}');
    const err = await apiFetch('/test').catch((e: unknown) => e as ApiError) as ApiError;
    expect(err.status).toBe(500);
    expect(err.retryable).toBe(true);
    expect(err.userMessage).toContain('went wrong');
  });

  it('503 → retryable, service busy', async () => {
    mockFetch(503, '{}');
    const err = await apiFetch('/test').catch((e: unknown) => e as ApiError) as ApiError;
    expect(err.status).toBe(503);
    expect(err.retryable).toBe(true);
    expect(err.userMessage).toContain('busy');
  });

  it('504 → retryable, timeout message', async () => {
    mockFetch(504, '{}');
    const err = await apiFetch('/test').catch((e: unknown) => e as ApiError) as ApiError;
    expect(err.status).toBe(504);
    expect(err.retryable).toBe(true);
    expect(err.userMessage).toContain('taking longer');
  });
});

// ── Network error ────────────────────────────────────────────────────
describe('apiFetch network error', () => {
  it('fetch throws → ApiError with status=0, retryable=true, offline message', async () => {
    mockFetchNetworkError();
    const err = await apiFetch('/test').catch((e: unknown) => e as ApiError) as ApiError;
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

// ── classModules + classConceptMastery API methods ──────────────────
describe('api.classModules', () => {
  it('calls the correct endpoint and returns modules', async () => {
    const mockModules: ClassModule[] = [
      {
        moduleId: 'mod-1',
        title: 'Fractions',
        wikiSlug: 'fractions',
        stage: 'LEARN',
        studentCount: 20,
        completedCount: 15,
        masteryPct: 72,
      },
    ];
    mockFetch(200, { data: mockModules });
    localStorageMock.setItem('memoly_token', 'tok');

    const result = await api.classModules('org-1', 'cls-1');
    expect(result.data).toEqual(mockModules);

    const fetchFn = vi.mocked(globalThis.fetch);
    const url = fetchFn.mock.calls[0][0] as string;
    expect(url).toContain('/centre/organizations/org-1/classes/cls-1/modules');
  });
});

describe('api.classConceptMastery', () => {
  it('calls the correct endpoint and returns concept mastery data', async () => {
    const mockData: ConceptMasteryData = {
      students: [{ id: 's-1', displayName: 'Alice', initials: 'AL' }],
      concepts: ['equivalent-fractions'],
      cells: [[0.85]],
      weakest: [{ concept: 'unlike-denom-addition', avg: 0.31 }],
    };
    mockFetch(200, { data: mockData });
    localStorageMock.setItem('memoly_token', 'tok');

    const result = await api.classConceptMastery('org-1', 'cls-1');
    expect(result.data.concepts).toEqual(['equivalent-fractions']);
    expect(result.data.weakest[0].avg).toBe(0.31);

    const fetchFn = vi.mocked(globalThis.fetch);
    const url = fetchFn.mock.calls[0][0] as string;
    expect(url).toContain('/centre/organizations/org-1/classes/cls-1/concept-mastery');
  });
});

// ── Narration API methods ────────────────────────────────────────────
describe('api.generateNarration', () => {
  it('POSTs to the correct endpoint and returns narrationId', async () => {
    mockFetch(202, { data: { narrationId: 'nar-1' } });
    localStorageMock.setItem('memoly_token', 'tok');

    const result = await api.generateNarration('org-1', 'cls-1', 'mod-1');
    expect(result.data.narrationId).toBe('nar-1');

    const fetchFn = vi.mocked(globalThis.fetch);
    const url = fetchFn.mock.calls[0][0] as string;
    const opts = fetchFn.mock.calls[0][1];
    expect(url).toContain('/centre/organizations/org-1/classes/cls-1/modules/mod-1/narration/generate');
    expect(opts?.method).toBe('POST');
  });
});

describe('api.getNarration', () => {
  it('GETs narration data when it exists', async () => {
    const mockNarration: NarrationData = {
      id: 'nar-1',
      status: 'READY',
      voiceId: 'voice-abc',
      totalDurationMs: 150000,
      segments: [
        { cardIndex: 0, scriptText: 'Hello students', audioUrl: 'https://example.com/a.mp3', durationMs: 75000 },
        { cardIndex: 1, scriptText: 'Today we learn', audioUrl: 'https://example.com/b.mp3', durationMs: 75000 },
      ],
    };
    mockFetch(200, { data: mockNarration });
    localStorageMock.setItem('memoly_token', 'tok');

    const result = await api.getNarration('org-1', 'cls-1', 'mod-1');
    expect(result.data?.status).toBe('READY');
    expect(result.data?.segments).toHaveLength(2);

    const fetchFn = vi.mocked(globalThis.fetch);
    const url = fetchFn.mock.calls[0][0] as string;
    expect(url).toContain('/centre/organizations/org-1/classes/cls-1/modules/mod-1/narration');
  });

  it('returns null data when no narration exists', async () => {
    mockFetch(200, { data: null });
    localStorageMock.setItem('memoly_token', 'tok');

    const result = await api.getNarration('org-1', 'cls-1', 'mod-1');
    expect(result.data).toBeNull();
  });
});

// ── Assignments API methods ─────────────────────────────────────────
describe('api.assignments', () => {
  it('GETs the correct endpoint and returns assignment list', async () => {
    const mockAssignments: AssignmentSummary[] = [
      {
        id: 'asgn-1',
        title: 'Chapter 5 Review',
        type: 'POST_CLASS',
        dueDate: '2026-06-15',
        completedCount: 15,
        totalStudents: 20,
        overdueCount: 2,
      },
    ];
    mockFetch(200, { data: mockAssignments });
    localStorageMock.setItem('memoly_token', 'tok');

    const result = await api.assignments('org-1', 'cls-1');
    expect(result.data).toEqual(mockAssignments);

    const fetchFn = vi.mocked(globalThis.fetch);
    const url = fetchFn.mock.calls[0][0] as string;
    expect(url).toContain('/centre/organizations/org-1/classes/cls-1/assignments');
  });
});

describe('api.createAssignment', () => {
  it('POSTs to the correct endpoint with body', async () => {
    const mockDetail: AssignmentDetail = {
      id: 'asgn-2',
      classId: 'cls-1',
      title: 'Revision Quiz',
      type: 'REVISION',
      moduleIds: 'mod-1',
      stages: 'PROVE',
      masteryThreshold: 60,
      students: [],
    };
    mockFetch(201, { data: mockDetail });
    localStorageMock.setItem('memoly_token', 'tok');

    const result = await api.createAssignment('org-1', 'cls-1', {
      title: 'Revision Quiz',
      type: 'REVISION',
      moduleIds: ['mod-1'],
      masteryThreshold: 60,
    });
    expect(result.data.id).toBe('asgn-2');

    const fetchFn = vi.mocked(globalThis.fetch);
    const url = fetchFn.mock.calls[0][0] as string;
    const opts = fetchFn.mock.calls[0][1];
    expect(url).toContain('/centre/organizations/org-1/classes/cls-1/assignments');
    expect(opts?.method).toBe('POST');
    expect(JSON.parse(opts?.body as string).masteryThreshold).toBe(60);
  });

  it('expands a bare date dueDate to a full ISO instant (backend Instant.parse)', async () => {
    mockFetch(201, { data: { id: 'a', classId: 'c', title: 't', type: 'REVISION', moduleIds: '', stages: '', masteryThreshold: 0, students: [] } });
    localStorageMock.setItem('memoly_token', 'tok');

    await api.createAssignment('org-1', 'cls-1', {
      title: 'Quiz', type: 'REVISION', moduleIds: ['mod-1'], dueDate: '2026-06-26',
    });

    const sent = JSON.parse(vi.mocked(globalThis.fetch).mock.calls[0][1]?.body as string);
    // No longer the bare date that 500'd; end-of-day SGT (23:59:59+08:00 = 15:59:59Z).
    expect(sent.dueDate).not.toBe('2026-06-26');
    expect(sent.dueDate).toBe('2026-06-26T15:59:59.000Z');
    expect(Number.isNaN(Date.parse(sent.dueDate))).toBe(false);
  });

  it('leaves an already-full instant dueDate untouched', async () => {
    mockFetch(201, { data: { id: 'a', classId: 'c', title: 't', type: 'REVISION', moduleIds: '', stages: '', masteryThreshold: 0, students: [] } });
    localStorageMock.setItem('memoly_token', 'tok');

    await api.createAssignment('org-1', 'cls-1', {
      title: 'Quiz', type: 'REVISION', moduleIds: ['mod-1'], dueDate: '2026-06-26T09:00:00.000Z',
    });

    const sent = JSON.parse(vi.mocked(globalThis.fetch).mock.calls[0][1]?.body as string);
    expect(sent.dueDate).toBe('2026-06-26T09:00:00.000Z');
  });
});

describe('toDueInstant', () => {
  it('expands a bare YYYY-MM-DD to end-of-day Asia/Singapore (not UTC)', () => {
    // 23:59:59 +08:00 == 15:59:59 UTC the same calendar day.
    expect(toDueInstant('2026-06-26')).toBe('2026-06-26T15:59:59.000Z');
  });

  it('passes a full instant through unchanged', () => {
    expect(toDueInstant('2026-06-26T09:00:00.000Z')).toBe('2026-06-26T09:00:00.000Z');
  });
});

describe('api.assignment (detail)', () => {
  it('GETs assignment detail with per-student status', async () => {
    const mockDetail: AssignmentDetail = {
      id: 'asgn-1',
      classId: 'cls-1',
      title: 'Chapter 5 Review',
      type: 'POST_CLASS',
      moduleIds: 'mod-1',
      stages: 'TEST,PROVE',
      masteryThreshold: null,
      personalized: true,
      completedCount: 1,
      overdueCount: 1,
      students: [
        {
          userId: 'u-1',
          displayName: 'Alice',
          status: 'COMPLETED',
          resolvedModules: [{ id: 'mod-1', title: 'Speed' }],
        },
        { userId: 'u-2', displayName: 'Bob', status: 'OVERDUE', resolvedModules: [] },
      ],
    };
    mockFetch(200, { data: mockDetail });
    localStorageMock.setItem('memoly_token', 'tok');

    const result = await api.assignment('org-1', 'cls-1', 'asgn-1');
    expect(result.data.students).toHaveLength(2);
    expect(result.data.students[0].status).toBe('COMPLETED');
    expect(result.data.students[0].resolvedModules?.[0].title).toBe('Speed');

    const fetchFn = vi.mocked(globalThis.fetch);
    const url = fetchFn.mock.calls[0][0] as string;
    expect(url).toContain('/centre/organizations/org-1/classes/cls-1/assignments/asgn-1');
  });
});

describe('api.deleteAssignment', () => {
  it('DELETEs the correct endpoint', async () => {
    mockFetch(204, '');
    localStorageMock.setItem('memoly_token', 'tok');

    await api.deleteAssignment('org-1', 'cls-1', 'asgn-1');

    const fetchFn = vi.mocked(globalThis.fetch);
    const url = fetchFn.mock.calls[0][0] as string;
    const opts = fetchFn.mock.calls[0][1];
    expect(url).toContain('/centre/organizations/org-1/classes/cls-1/assignments/asgn-1');
    expect(opts?.method).toBe('DELETE');
  });
});

// ── Content Review API methods ──────────────────────────────────────
describe('api.contentReview', () => {
  it('GETs review items for the class', async () => {
    const mockItems: ReviewItem[] = [
      {
        itemId: 'item-1',
        moduleTitle: 'Fractions',
        pageSlug: 'fractions',
        type: 'LEARN',
        contentJson: '{"title":"Adding Fractions","body":"To add fractions..."}',
        status: 'DRAFT',
      },
      {
        itemId: 'item-2',
        moduleTitle: 'Fractions',
        pageSlug: 'fractions',
        type: 'HOT_TAKE',
        contentJson: '{"statement":"1/2 + 1/3 = 2/5","answer":false}',
        status: 'DRAFT',
      },
    ];
    mockFetch(200, { data: mockItems });
    localStorageMock.setItem('memoly_token', 'tok');

    const result = await api.contentReview('org-1', 'cls-1');
    expect(result.data).toHaveLength(2);
    expect(result.data[0].type).toBe('LEARN');

    const fetchFn = vi.mocked(globalThis.fetch);
    const url = fetchFn.mock.calls[0][0] as string;
    expect(url).toContain('/centre/organizations/org-1/classes/cls-1/content/review');
  });
});

describe('api.patchContentItem', () => {
  it('PATCHes a content item with status', async () => {
    mockFetch(200, { data: { itemId: 'item-1', moduleTitle: 'Fractions', type: 'LEARN', contentJson: '{}', status: 'APPROVED' } });
    localStorageMock.setItem('memoly_token', 'tok');

    const result = await api.patchContentItem('org-1', 'cls-1', 'item-1', { status: 'APPROVED' });
    expect(result.data.status).toBe('APPROVED');

    const fetchFn = vi.mocked(globalThis.fetch);
    const url = fetchFn.mock.calls[0][0] as string;
    const opts = fetchFn.mock.calls[0][1];
    expect(url).toContain('/centre/organizations/org-1/classes/cls-1/content/item-1');
    expect(opts?.method).toBe('PATCH');
  });
});

describe('api.approveAllContent', () => {
  it('POSTs to approve-all and returns count', async () => {
    mockFetch(200, { data: { approvedCount: 5 } });
    localStorageMock.setItem('memoly_token', 'tok');

    const result = await api.approveAllContent('org-1', 'cls-1');
    expect(result.data.approvedCount).toBe(5);

    const fetchFn = vi.mocked(globalThis.fetch);
    const url = fetchFn.mock.calls[0][0] as string;
    const opts = fetchFn.mock.calls[0][1];
    expect(url).toContain('/centre/organizations/org-1/classes/cls-1/content/approve-all');
    expect(opts?.method).toBe('POST');
  });
});

// ── Exam Readiness API method ───────────────────────────────────────
describe('api.examReadiness', () => {
  it('GETs exam readiness data with concepts', async () => {
    const mockData: ExamReadiness = {
      avgReadiness: 0.72,
      studentsBelow60: 4,
      totalStudents: 20,
      concepts: [
        { concept: 'equivalent-fractions', avgMastery: 0.85 },
        { concept: 'unlike-denom-addition', avgMastery: 0.31 },
      ],
    };
    mockFetch(200, { data: mockData });
    localStorageMock.setItem('memoly_token', 'tok');

    const result = await api.examReadiness('org-1', 'cls-1');
    expect(result.data.avgReadiness).toBe(0.72);
    expect(result.data.studentsBelow60).toBe(4);
    expect(result.data.concepts).toHaveLength(2);

    const fetchFn = vi.mocked(globalThis.fetch);
    const url = fetchFn.mock.calls[0][0] as string;
    expect(url).toContain('/centre/organizations/org-1/classes/cls-1/exam-readiness');
  });
});

// ── Model answers & release (A2) ────────────────────────────────────
describe('api.setModelAnswer', () => {
  it('PUTs the model answer (object) to the correct endpoint', async () => {
    mockFetch(200, { data: { modelAnswer: { q1: 'A' }, answersReleased: false, answersReleasedAt: null } });
    localStorageMock.setItem('memoly_token', 'tok');

    const result = await api.setModelAnswer('org-1', 'cls-1', 'asgn-1', { q1: 'A' });
    expect(result.data.answersReleased).toBe(false);
    expect(result.data.answersReleasedAt).toBeNull();

    const fetchFn = vi.mocked(globalThis.fetch);
    const url = fetchFn.mock.calls[0][0] as string;
    const opts = fetchFn.mock.calls[0][1];
    expect(url).toContain('/centre/organizations/org-1/classes/cls-1/assignments/asgn-1/model-answer');
    expect(opts?.method).toBe('PUT');
    expect(JSON.parse(opts?.body as string)).toEqual({ modelAnswer: { q1: 'A' } });
  });

  it('accepts a plain string model answer', async () => {
    mockFetch(200, { data: { modelAnswer: 'The answer is 4', answersReleased: false, answersReleasedAt: null } });
    localStorageMock.setItem('memoly_token', 'tok');

    await api.setModelAnswer('org-1', 'cls-1', 'asgn-1', 'The answer is 4');

    const fetchFn = vi.mocked(globalThis.fetch);
    const opts = fetchFn.mock.calls[0][1];
    expect(JSON.parse(opts?.body as string).modelAnswer).toBe('The answer is 4');
  });
});

describe('api.releaseAnswers', () => {
  it('POSTs releaseNow=true', async () => {
    mockFetch(200, { data: { modelAnswer: 'x', answersReleased: true, answersReleasedAt: '2026-06-12T10:00:00Z' } });
    localStorageMock.setItem('memoly_token', 'tok');

    const result = await api.releaseAnswers('org-1', 'cls-1', 'asgn-1', { releaseNow: true });
    expect(result.data.answersReleased).toBe(true);
    expect(result.data.answersReleasedAt).toBe('2026-06-12T10:00:00Z');

    const fetchFn = vi.mocked(globalThis.fetch);
    const url = fetchFn.mock.calls[0][0] as string;
    const opts = fetchFn.mock.calls[0][1];
    expect(url).toContain('/centre/organizations/org-1/classes/cls-1/assignments/asgn-1/release');
    expect(opts?.method).toBe('POST');
    expect(JSON.parse(opts?.body as string)).toEqual({ releaseNow: true });
  });

  it('POSTs a scheduled releaseAt ISO string', async () => {
    mockFetch(200, { data: { modelAnswer: 'x', answersReleased: false, answersReleasedAt: null } });
    localStorageMock.setItem('memoly_token', 'tok');

    await api.releaseAnswers('org-1', 'cls-1', 'asgn-1', { releaseAt: '2026-06-20T09:00:00.000Z' });

    const fetchFn = vi.mocked(globalThis.fetch);
    const opts = fetchFn.mock.calls[0][1];
    expect(JSON.parse(opts?.body as string)).toEqual({ releaseAt: '2026-06-20T09:00:00.000Z' });
  });

  it('POSTs an empty body to default to the due date', async () => {
    mockFetch(200, { data: { modelAnswer: 'x', answersReleased: false, answersReleasedAt: null } });
    localStorageMock.setItem('memoly_token', 'tok');

    await api.releaseAnswers('org-1', 'cls-1', 'asgn-1', {});

    const fetchFn = vi.mocked(globalThis.fetch);
    const opts = fetchFn.mock.calls[0][1];
    expect(JSON.parse(opts?.body as string)).toEqual({});
  });
});

// ── Muddiest point (A3) ─────────────────────────────────────────────
describe('api.muddiest', () => {
  it('GETs muddiest points for a class + module (bare array response)', async () => {
    const mockPoints: MuddiestPoint[] = [
      { conceptId: 'c-1', conceptLabel: 'Photosynthesis', count: 7 },
      { conceptId: 'c-2', conceptLabel: 'Respiration', count: 3 },
    ];
    mockFetch(200, mockPoints);
    localStorageMock.setItem('memoly_token', 'tok');

    const result = await api.muddiest('cls-1', 'mod-1');
    expect(result).toHaveLength(2);
    expect(result[0].count).toBe(7);

    const fetchFn = vi.mocked(globalThis.fetch);
    const url = fetchFn.mock.calls[0][0] as string;
    expect(url).toContain('/classes/cls-1/muddiest?moduleId=mod-1');
  });

  it('URL-encodes the moduleId', async () => {
    mockFetch(200, []);
    localStorageMock.setItem('memoly_token', 'tok');

    await api.muddiest('cls-1', 'mod 1/x');

    const fetchFn = vi.mocked(globalThis.fetch);
    const url = fetchFn.mock.calls[0][0] as string;
    expect(url).toContain('moduleId=mod%201%2Fx');
  });
});

// ── Challenges (A4) ─────────────────────────────────────────────────
describe('api.createChallenge', () => {
  it('POSTs a challenge with options + answer + revealAt', async () => {
    mockFetch(201, { id: 'ch-1', classId: 'cls-1', revealAt: '2026-06-20T09:00:00Z' });
    localStorageMock.setItem('memoly_token', 'tok');

    const body: CreateChallengeBody = {
      question: 'What is 2+2?',
      options: ['3', '4', '5'],
      answer: '4',
      revealAt: '2026-06-20T09:00:00Z',
    };
    const result = await api.createChallenge('org-1', 'cls-1', body);
    expect(result.id).toBe('ch-1');

    const fetchFn = vi.mocked(globalThis.fetch);
    const url = fetchFn.mock.calls[0][0] as string;
    const opts = fetchFn.mock.calls[0][1];
    expect(url).toContain('/centre/organizations/org-1/classes/cls-1/challenges');
    expect(opts?.method).toBe('POST');
    expect(JSON.parse(opts?.body as string)).toEqual(body);
  });
});

describe('api.listChallenges', () => {
  it('GETs the class challenge list (bare array, newest first)', async () => {
    const mockChallenges: Challenge[] = [
      { id: 'ch-2', classId: 'cls-1', question: 'Latest?', revealAt: '2026-06-25T09:00:00Z' },
      { id: 'ch-1', classId: 'cls-1', question: 'Older?', answer: '4', revealAt: '2026-06-01T09:00:00Z' },
    ];
    mockFetch(200, mockChallenges);
    localStorageMock.setItem('memoly_token', 'tok');

    const result = await api.listChallenges('cls-1');
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('ch-2');
    expect(result[1].answer).toBe('4');

    const fetchFn = vi.mocked(globalThis.fetch);
    const url = fetchFn.mock.calls[0][0] as string;
    expect(url).toContain('/classes/cls-1/challenges');
  });
});

// ── Classroom Boss Sessions ─────────────────────────────────────────
describe('api.createClassroomSession', () => {
  it('POSTs the picked wikiPageId, unwraps { data }', async () => {
    const state: ClassroomSessionState = {
      sessionId: 'sess-1', status: 'CREATED', topicSlug: 'fractions',
      joinCode: 'ABC123', hpRemaining: 3, hpMax: 3, defeated: false,
      participantCount: 0, currentQuestion: null,
    };
    mockFetch(201, { data: state });
    localStorageMock.setItem('memoly_token', 'tok');

    const result = await api.createClassroomSession('org-1', 'cls-1', 'page-1');
    expect(result.data.sessionId).toBe('sess-1');
    expect(result.data.joinCode).toBe('ABC123');

    const fetchFn = vi.mocked(globalThis.fetch);
    const url = fetchFn.mock.calls[0][0] as string;
    const opts = fetchFn.mock.calls[0][1];
    expect(url).toContain('/centre/organizations/org-1/classes/cls-1/classroom-sessions');
    expect(opts?.method).toBe('POST');
    expect(JSON.parse(opts?.body as string)).toEqual({ wikiPageId: 'page-1' });
  });
});

describe('api.startClassroomSession / endClassroomSession', () => {
  it('POSTs to the /start and /end sub-paths', async () => {
    const state: ClassroomSessionState = {
      sessionId: 'sess-1', status: 'ACTIVE', topicSlug: 'fractions',
      joinCode: 'ABC123', hpRemaining: 3, hpMax: 3, defeated: false,
      participantCount: 1, currentQuestion: null,
    };
    mockFetch(200, { data: state });
    localStorageMock.setItem('memoly_token', 'tok');

    await api.startClassroomSession('org-1', 'cls-1', 'sess-1');
    let fetchFn = vi.mocked(globalThis.fetch);
    expect(fetchFn.mock.calls[0][0]).toContain('/classroom-sessions/sess-1/start');
    expect(fetchFn.mock.calls[0][1]?.method).toBe('POST');

    mockFetch(200, { data: { ...state, status: 'ENDED' } });
    await api.endClassroomSession('org-1', 'cls-1', 'sess-1');
    fetchFn = vi.mocked(globalThis.fetch);
    expect(fetchFn.mock.calls[0][0]).toContain('/classroom-sessions/sess-1/end');
    expect(fetchFn.mock.calls[0][1]?.method).toBe('POST');
  });
});

describe('api.classroomSessionState', () => {
  it('GETs the live state (polled by the teacher scoreboard)', async () => {
    const state: ClassroomSessionState = {
      sessionId: 'sess-1', status: 'ACTIVE', topicSlug: 'fractions',
      joinCode: 'ABC123', hpRemaining: 1, hpMax: 3, defeated: false,
      participantCount: 4, currentQuestion: { id: 'q1', question: '1/2 of 4?', options: ['1', '2'] },
    };
    mockFetch(200, { data: state });
    localStorageMock.setItem('memoly_token', 'tok');

    const result = await api.classroomSessionState('org-1', 'cls-1', 'sess-1');
    expect(result.data.hpRemaining).toBe(1);
    expect(result.data.participantCount).toBe(4);

    const fetchFn = vi.mocked(globalThis.fetch);
    const url = fetchFn.mock.calls[0][0] as string;
    expect(url).toContain('/centre/organizations/org-1/classes/cls-1/classroom-sessions/sess-1/state');
    expect(fetchFn.mock.calls[0][1]?.method).toBeUndefined(); // GET (no method override)
  });
});

// ── File Review (OCR quality gate) ─────────────────────────────────
describe('api.reviewFile', () => {
  it('PATCHes with APPROVE action and no editedText', async () => {
    mockFetch(200, { data: { status: 'APPROVED' } });
    localStorageMock.setItem('memoly_token', 'tok');

    const result = await api.reviewFile('avatar-1', 'file-1', 'APPROVE');
    expect(result.data).toEqual({ status: 'APPROVED' });

    const fetchFn = vi.mocked(globalThis.fetch);
    const url = fetchFn.mock.calls[0][0] as string;
    const opts = fetchFn.mock.calls[0][1];
    expect(url).toContain('/avatars/avatar-1/files/file-1/review');
    expect(opts?.method).toBe('PATCH');
    const body = JSON.parse(opts?.body as string);
    expect(body.action).toBe('APPROVE');
    expect(body.editedText).toBeUndefined();
  });

  it('PATCHes with EDIT action and includes editedText', async () => {
    mockFetch(200, { data: { status: 'EDITED' } });
    localStorageMock.setItem('memoly_token', 'tok');

    const result = await api.reviewFile('avatar-1', 'file-1', 'EDIT', 'Corrected text here');
    expect(result.data).toEqual({ status: 'EDITED' });

    const fetchFn = vi.mocked(globalThis.fetch);
    const opts = fetchFn.mock.calls[0][1];
    const body = JSON.parse(opts?.body as string);
    expect(body.action).toBe('EDIT');
    expect(body.editedText).toBe('Corrected text here');
  });

  it('does not include editedText when undefined', async () => {
    mockFetch(200, { data: {} });
    localStorageMock.setItem('memoly_token', 'tok');

    await api.reviewFile('avatar-1', 'file-1', 'APPROVE');

    const fetchFn = vi.mocked(globalThis.fetch);
    const opts = fetchFn.mock.calls[0][1];
    const body = JSON.parse(opts?.body as string);
    expect('editedText' in body).toBe(false);
  });
});

// ── Wiki page edit / human correction (web↔mobile content parity) ────
describe('api.getWikiPage', () => {
  it('GETs a single wiki page by slug', async () => {
    mockFetch(200, { data: { id: 'w-1', slug: 'photosynthesis', title: 'Photosynthesis', content: 'Plants…' } });
    localStorageMock.setItem('memoly_token', 'tok');

    const res = await api.getWikiPage('av-1', 'photosynthesis');
    expect(res.data.slug).toBe('photosynthesis');

    const fetchFn = vi.mocked(globalThis.fetch);
    const url = fetchFn.mock.calls[0][0] as string;
    const opts = fetchFn.mock.calls[0][1];
    expect(url).toContain('/avatars/av-1/wiki/pages/photosynthesis');
    expect(opts?.method ?? 'GET').toBe('GET');
  });

  it('URL-encodes the slug', async () => {
    mockFetch(200, { data: {} });
    localStorageMock.setItem('memoly_token', 'tok');

    await api.getWikiPage('av-1', 'cell biology/intro');

    const url = vi.mocked(globalThis.fetch).mock.calls[0][0] as string;
    expect(url).toContain('/wiki/pages/cell%20biology%2Fintro');
  });
});

describe('api.applyCorrection', () => {
  it('PATCHes the correction under the { correction } key the backend expects', async () => {
    mockFetch(200, { data: { id: 'w-1', slug: 'photosynthesis', humanVerified: true } });
    localStorageMock.setItem('memoly_token', 'tok');

    const res = await api.applyCorrection('av-1', 'photosynthesis', 'Corrected explanation.');
    expect(res.data.humanVerified).toBe(true);

    const fetchFn = vi.mocked(globalThis.fetch);
    const url = fetchFn.mock.calls[0][0] as string;
    const opts = fetchFn.mock.calls[0][1];
    expect(url).toContain('/avatars/av-1/wiki/pages/photosynthesis/correction');
    expect(opts?.method).toBe('PATCH');
    expect(JSON.parse(opts?.body as string)).toEqual({ correction: 'Corrected explanation.' });
  });
});

describe('api.regenerateContent (propagation → DRAFT for Review)', () => {
  it('POSTs to the centre regenerate endpoint with optional guidance', async () => {
    mockFetch(200, { data: { pageSlug: 'photosynthesis', moduleId: 'm-1', regenerated: true } });
    localStorageMock.setItem('memoly_token', 'tok');

    const res = await api.regenerateContent('org-1', 'cls-1', 'photosynthesis', 'use simpler examples');
    expect(res.data.regenerated).toBe(true);

    const fetchFn = vi.mocked(globalThis.fetch);
    const url = fetchFn.mock.calls[0][0] as string;
    const opts = fetchFn.mock.calls[0][1];
    expect(url).toContain('/centre/organizations/org-1/classes/cls-1/content/photosynthesis/regenerate');
    expect(opts?.method).toBe('POST');
    expect(JSON.parse(opts?.body as string)).toEqual({ guidance: 'use simpler examples' });
  });

  it('omits guidance from the body when not provided', async () => {
    mockFetch(200, { data: { pageSlug: 'p', moduleId: 'm', regenerated: true } });
    localStorageMock.setItem('memoly_token', 'tok');

    await api.regenerateContent('org-1', 'cls-1', 'p');

    const opts = vi.mocked(globalThis.fetch).mock.calls[0][1];
    expect(JSON.parse(opts?.body as string)).toEqual({});
  });
});

// ── asArray: the systemic unwrap guard ───────────────────────────────
// apiFetch returns the FULL body `{ data: T, ... }`, so for list endpoints
// query.data is the WRAPPER, not the array. `?? []` only catches null/undefined,
// so `.map`/`.filter` on the wrapper object threw "x is not a function" at runtime.
// asArray normalises every shape the boundary can produce into a real T[].
describe('asArray (unwrap guard)', () => {
  it('unwraps the { data: [...] } wrapper into the inner array', () => {
    const wrapper = { data: [{ id: 1 }, { id: 2 }] };
    expect(asArray<{ id: number }>(wrapper)).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it('returns a raw array unchanged', () => {
    const raw = [{ id: 1 }];
    expect(asArray<{ id: number }>(raw)).toBe(raw);
  });

  it('returns [] for null / undefined (no throw on missing data)', () => {
    expect(asArray(null)).toEqual([]);
    expect(asArray(undefined)).toEqual([]);
  });

  it('returns [] for an object whose .data is not an array', () => {
    // e.g. a single-object response or an error envelope — never crash on .map
    expect(asArray({ data: { id: 1 } })).toEqual([]);
    expect(asArray({ data: 'oops' })).toEqual([]);
    expect(asArray({ notData: [1, 2] })).toEqual([]);
  });

  it('returns [] for primitives', () => {
    expect(asArray('string')).toEqual([]);
    expect(asArray(42)).toEqual([]);
    expect(asArray(true)).toEqual([]);
  });

  it('result is always safely mappable (the invariant the crash violated)', () => {
    // Every shape the boundary can hand us must be .map-able without throwing.
    for (const shape of [null, undefined, { data: { x: 1 } }, 'str', { data: [10] }, [20]]) {
      expect(() => asArray<number>(shape).map((n) => n)).not.toThrow();
    }
  });
});
