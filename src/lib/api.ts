const BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('memoly_token');
}

export async function apiFetch<T>(
  path: string,
  opts?: RequestInit & { skipAuth?: boolean }
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts?.headers as Record<string, string>),
  };
  if (token && !opts?.skipAuth) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(BASE + '/api/v1' + path, {
    ...opts,
    headers,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }

  return res.json() as Promise<T>;
}

// ── Types ──────────────────────────────────────────────────────────────
export interface Avatar {
  id: string;
  name: string;
  subject: string;
  characterType: string;
  wikiPageCount: number;
  fileCount?: number;
  brainState?: string;
  createdAt: string;
  // Centre-mode fields (null for personal avatars)
  centreManaged?: boolean;
  centreId?: string;
  centreBrandName?: string;
  centreAccentColor?: string;
}

export interface WikiPage {
  id: string;
  avatarId: string;
  slug: string;
  title: string;
  content: string;
  certainty: 'VERIFIED' | 'INFERRED' | 'CONFLICTED';
  hasConflict: boolean;
  updatedAt: string;
}

export interface KnowledgeFile {
  id: string;
  fileName: string;
  uploadType: string;
  pageCount: number;
  status: 'PROCESSING' | 'READY' | 'FAILED';
  createdAt: string;
}

export interface UsageToday {
  subscriptionTier: string;
  chatUsed: number;
  chatLimit: number;
  chatRemaining: number;
  mochiCap: number;
}

export interface LoginResponse {
  data: {
    token: string;
    userId: string;
    isNewUser?: boolean;
    setupComplete?: boolean;
  };
}

export interface AvatarsResponse { data: Avatar[] }
export interface AvatarResponse  { data: Avatar }
export interface WikiPagesResponse { data: WikiPage[] }
export interface FilesResponse { data: KnowledgeFile[] }
export interface UsageResponse { data: UsageToday }

export interface UploadResponse {
  data: {
    id: string;
    fileName: string;
    pageCount: number;
    status: string;
  };
}

export interface RelevanceResponse {
  data: {
    score: number;
    reason: string;
    isRelevant: boolean;
  };
}

// Analytics types
export interface OverviewData {
  activeThisWeek: number;
  totalStudents: number;
  avgGrasp: number;
  graspDelta: number;
  topicsLive: number;
  atRiskCount: number;
  graspTrend: Array<{ week: string; value: number }>;
  classes: Array<{ cohort: string; studentCount: number; avgGrasp: number }>;
  atRisk: Array<{ studentId: string; name: string; cohort: string; reason: string; severity: string }>;
  recentActivity: Array<{ studentName: string; topic: string; wasCorrect: boolean; at: string }>;
}

export interface HeatmapData {
  students: Array<{ id: string; displayName: string; initials: string }>;
  topics: string[];
  cells: Array<Array<number | null>>;
  topicAverages: Array<{ topic: string; avg: number }>;
  weakest: Array<{ topic: string; avg: number }>;
}

export interface StudentData {
  studentId: string;
  displayName: string;
  cohortLabel: string;
  streakDays: number;
  level: number;
  xp: number;
  grasp: number;
  examInDays: number;
  graspOverTime: Array<{ week: string; value: number }>;
  topicGrasp: Array<{ topic: string; grasp: number; attempts: number }>;
  engagement: { questions: number; quizDays: number; lastActive: string };
}

export interface RosterData {
  students: Array<{
    userId: string;
    displayName: string;
    level: number;
    xp: number;
    streakDays: number;
    cohortLabel: string;
  }>;
  totalElements: number;
}

// ── API methods ────────────────────────────────────────────────────────
export const api = {
  // Auth
  login: (email: string, password: string) =>
    apiFetch<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      skipAuth: true,
    }),

  // Avatars (Mochis)
  avatars: () => apiFetch<AvatarsResponse>('/avatars'),
  avatar: (id: string) => apiFetch<AvatarResponse>(`/avatars/${id}`),

  // Centre-Mochi-aware avatar list: returns all, centreManaged ones are ABC Mochi
  centreAvatars: async (): Promise<Avatar[]> => {
    const res = await apiFetch<AvatarsResponse>('/avatars');
    return (res.data ?? []).filter((a) => a.centreManaged);
  },

  // Knowledge / wiki
  wikiPages: (avatarId: string) =>
    apiFetch<WikiPagesResponse>(`/avatars/${avatarId}/wiki/pages`),

  files: (avatarId: string) =>
    apiFetch<FilesResponse>(`/avatars/${avatarId}/files`),

  // Upload — multipart, no Content-Type header (browser sets boundary)
  uploadFile: async (avatarId: string, file: File): Promise<UploadResponse> => {
    const form = new FormData();
    form.append('file', file);
    const token = getToken();

    const res = await fetch(`${BASE}/api/v1/avatars/${avatarId}/files`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`${res.status}: ${text}`);
    }

    return res.json() as Promise<UploadResponse>;
  },

  // Relevance check before upload
  checkRelevance: (avatarId: string, text: string) =>
    apiFetch<RelevanceResponse>(`/avatars/${avatarId}/relevance`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),

  // Usage / quota
  usageToday: () => apiFetch<UsageResponse>('/usage/today'),

  // Delete a knowledge file
  deleteFile: (avatarId: string, fileId: string) =>
    apiFetch<void>(`/avatars/${avatarId}/files/${fileId}`, { method: 'DELETE' }),

  // Centre me (orgId resolver)
  centreMe: async () => {
    const orgId = process.env.NEXT_PUBLIC_DEMO_ORG_ID;
    if (orgId) return { data: { orgId } };
    throw new Error('NEXT_PUBLIC_DEMO_ORG_ID not set');
  },

  // Analytics
  overview: (orgId: string, cohort?: string) =>
    apiFetch<{ data: OverviewData }>(
      `/centre/organizations/${orgId}/overview${cohort ? `?cohort=${encodeURIComponent(cohort)}` : ''}`
    ),

  classes: (orgId: string) =>
    apiFetch<{ data: Array<{ cohort: string; studentCount: number; avgGrasp: number }> }>(
      `/centre/organizations/${orgId}/classes`
    ),

  heatmap: (orgId: string, cohort: string) =>
    apiFetch<{ data: HeatmapData }>(
      `/centre/organizations/${orgId}/classes/${encodeURIComponent(cohort)}/heatmap`
    ),

  student: (orgId: string, studentId: string) =>
    apiFetch<{ data: StudentData }>(
      `/centre/organizations/${orgId}/students/${studentId}`
    ),

  roster: (orgId: string, cohort?: string, page = 0, size = 50) =>
    apiFetch<{ data: RosterData }>(
      `/centre/organizations/${orgId}/roster?page=${page}&size=${size}${cohort ? `&cohort=${encodeURIComponent(cohort)}` : ''}`
    ),
};

// ── Character helpers ──────────────────────────────────────────────────

/** Maps a characterType from the API to a display emoji (fallback 🐾). */
export function characterEmoji(characterType: string): string {
  const map: Record<string, string> = {
    MOCHI: '🐻', PENCIL: '✏️', SCIENCE: '🔬', PE: '⚽',
    ART: '🎨', LUNCHBOX: '🍱', LIBRARY: '📚', HEADMASTER: '🎩',
    GOLDSTAR: '⭐',
    ATWBERET: '🎭', ATWGLOBERIDER: '🌍', ATWKEBAYA: '👘',
    AWLTIONCITY: '🦁', ATWPHARAOH: '🏺', ATWSAKURA: '🌸',
    ATWSOMBRERO: '🪅',
  };
  return map[characterType?.toUpperCase()] ?? '🐾';
}

/** Returns a Tailwind bg class for a subject string. */
export function subjectColor(subject: string): string {
  const map: Record<string, string> = {
    MATHS: 'bg-blue-900/40 text-blue-300',
    MATH: 'bg-blue-900/40 text-blue-300',
    SCIENCE: 'bg-green-900/40 text-green-300',
    ENGLISH: 'bg-purple-900/40 text-purple-300',
    HISTORY: 'bg-amber-900/40 text-amber-300',
    GEOGRAPHY: 'bg-teal-900/40 text-teal-300',
    CHEMISTRY: 'bg-red-900/40 text-red-300',
    PHYSICS: 'bg-indigo-900/40 text-indigo-300',
    BIOLOGY: 'bg-emerald-900/40 text-emerald-300',
    GENERAL: 'bg-panel2 text-ink2',
  };
  return map[subject?.toUpperCase()] ?? 'bg-panel2 text-ink2';
}
