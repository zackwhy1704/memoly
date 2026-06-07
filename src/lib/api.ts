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
  createdAt: string;
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

export interface LoginResponse {
  data: {
    token: string;
    userId: string;
  };
}

export interface AvatarsResponse {
  data: Avatar[];
}

export interface AvatarResponse {
  data: Avatar;
}

export interface WikiPagesResponse {
  data: WikiPage[];
}

export interface UploadResponse {
  data: {
    id: string;
    fileName: string;
    pageCount: number;
    status: string;
  };
}

// ── API methods ────────────────────────────────────────────────────────
export const api = {
  login: (email: string, password: string) =>
    apiFetch<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      skipAuth: true,
    }),

  avatars: () => apiFetch<AvatarsResponse>('/avatars'),

  avatar: (id: string) => apiFetch<AvatarResponse>(`/avatars/${id}`),

  wikiPages: (avatarId: string) =>
    apiFetch<WikiPagesResponse>(`/avatars/${avatarId}/wiki/pages`),

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
};
