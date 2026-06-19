import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ApiError,
  apiFetch,
  api,
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
        avgMastery: 0.72,
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
      title: 'Revision Quiz',
      type: 'REVISION',
      dueDate: null,
      completedCount: 0,
      totalStudents: 20,
      overdueCount: 0,
      moduleIds: ['mod-1'],
      stages: [],
      masteryThreshold: 60,
      perStudentStatus: [],
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
});

describe('api.assignment (detail)', () => {
  it('GETs assignment detail with per-student status', async () => {
    const mockDetail: AssignmentDetail = {
      id: 'asgn-1',
      title: 'Chapter 5 Review',
      type: 'POST_CLASS',
      dueDate: '2026-06-15',
      completedCount: 1,
      totalStudents: 2,
      overdueCount: 1,
      moduleIds: ['mod-1'],
      stages: [],
      masteryThreshold: null,
      perStudentStatus: [
        { userId: 'u-1', displayName: 'Alice', status: 'COMPLETED', score: 92 },
        { userId: 'u-2', displayName: 'Bob', status: 'OVERDUE', score: null },
      ],
    };
    mockFetch(200, { data: mockDetail });
    localStorageMock.setItem('memoly_token', 'tok');

    const result = await api.assignment('org-1', 'cls-1', 'asgn-1');
    expect(result.data.perStudentStatus).toHaveLength(2);
    expect(result.data.perStudentStatus[0].status).toBe('COMPLETED');

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
