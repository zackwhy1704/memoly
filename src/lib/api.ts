const BASE = process.env.NEXT_PUBLIC_API_URL!;

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('memoly_token');
}

async function apiFetch<T>(
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

  const res = await fetch(BASE + path, {
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

    const res = await fetch(`${BASE}/avatars/${avatarId}/files`, {
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
    MATHS: 'bg-blue-100 text-blue-700',
    MATH: 'bg-blue-100 text-blue-700',
    SCIENCE: 'bg-green-100 text-green-700',
    ENGLISH: 'bg-purple-100 text-purple-700',
    HISTORY: 'bg-amber-100 text-amber-700',
    GEOGRAPHY: 'bg-teal-100 text-teal-700',
    CHEMISTRY: 'bg-red-100 text-red-700',
    PHYSICS: 'bg-indigo-100 text-indigo-700',
    BIOLOGY: 'bg-emerald-100 text-emerald-700',
    GENERAL: 'bg-gray-100 text-gray-600',
  };
  return map[subject?.toUpperCase()] ?? 'bg-gray-100 text-gray-600';
}
