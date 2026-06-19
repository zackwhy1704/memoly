import { clearAuth } from './auth';

// Backend base URL. Defaults to the Railway production host so deploys work with
// no env config; override with NEXT_PUBLIC_API_URL for local/staging backends.
const BASE =
  process.env.NEXT_PUBLIC_API_URL ??
  'https://pallybackend-production.up.railway.app/api/v1';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('memoly_token');
}

// ── Typed API Error ───────────────────────────────────────────────────
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string | null,
    public userMessage: string,
    public retryable: boolean
  ) {
    super(userMessage);
    this.name = 'ApiError';
  }
}

function statusToApiError(status: number, body: string): ApiError {
  // Try to parse the backend envelope: { error, data, status }
  let code: string | null = null;
  let backendMsg: string | null = null;
  try {
    const parsed = JSON.parse(body);
    code = parsed.code ?? null;
    backendMsg = parsed.error ?? parsed.message ?? null;
  } catch {
    /* body wasn't JSON — use fallback messages */
  }

  switch (status) {
    case 400:
      return new ApiError(400, code, backendMsg || 'Something was off with that request.', false);
    case 401: {
      // Only redirect if we had a token — avoid redirect loop on login form submits.
      if (typeof window !== 'undefined' && localStorage.getItem('memoly_token')) {
        clearAuth();
        window.location.assign('/login');
      }
      return new ApiError(401, code, 'Session expired — please sign in again.', false);
    }
    case 403:
      return new ApiError(403, code, backendMsg || "You don't have access to that.", false);
    case 404:
      return new ApiError(404, code, backendMsg || 'Not found.', false);
    case 413:
      return new ApiError(413, code, 'File too large (max 25MB).', false);
    case 429:
      return new ApiError(429, code, 'Too many requests — give it a moment.', true);
    case 500:
      return new ApiError(500, code, backendMsg || 'Something went wrong on our side. Please try again.', true);
    case 503:
      return new ApiError(503, code, 'The service is busy right now — retry shortly.', true);
    case 504:
      return new ApiError(504, code, 'This is taking longer than usual — it may still be processing in the background.', true);
    default:
      return new ApiError(status, code, backendMsg || `Unexpected error (${status}).`, status >= 500);
  }
}

export async function apiFetch<T>(
  path: string,
  opts?: RequestInit & { skipAuth?: boolean; timeoutMs?: number }
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts?.headers as Record<string, string>),
  };
  if (token && !opts?.skipAuth) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts?.timeoutMs ?? 30_000);

  let res: Response;
  try {
    res = await fetch(BASE + path, {
      ...opts,
      headers,
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError(0, 'TIMEOUT', 'This is taking too long — please try again.', true);
    }
    throw new ApiError(0, 'NETWORK', 'You appear to be offline. Check your connection.', true);
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const text = await res.text();
    throw statusToApiError(res.status, text);
  }

  return res.json() as Promise<T>;
}

// ── Types ──────────────────────────────────────────────────────────────

/** Server-derived uniform for a CENTRE_CLASS avatar. Present only when
 *  `kind === 'CENTRE_CLASS'`. Derivation lives server-side — never re-derive. */
export interface ClassAvatarAppearance {
  bandColorHex: string;
  subjectGlyph: string;
  initials: string;
}

export interface Avatar {
  id: string;
  name: string;
  subject: string;
  characterType: string;
  wikiPageCount: number;
  fileCount?: number;
  brainState?: string;
  createdAt: string;
  // Avatar kind — always present in the current contract.
  kind?: 'PERSONAL' | 'CENTRE_CLASS';
  // Server-derived uniform — present ONLY when kind === 'CENTRE_CLASS'.
  appearance?: ClassAvatarAppearance;
  // Centre-mode fields (null for personal avatars)
  centreManaged?: boolean;
  centreId?: string;
  centreBrandName?: string;
  centreAccentColor?: string;
  // Teaching instruction fed into the tutor's system prompt (## TEACHER
  // INSTRUCTIONS). For a class corpus this is the teacher's per-class style.
  teacherPreferences?: string;
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

export interface MeResponse {
  data: {
    userId: string;
    email: string;
    displayName: string;
    setupComplete: boolean;
    role: string;            // 'USER' | 'ADMIN'
    isCentreStaff: boolean;  // true if owns an org OR active org_staff row
    isOwner: boolean;        // true only if owns the org (not just staff)
    accountStatus: string;
    defaultAnswerMode: string;
  };
}

export interface OrgStaffMember {
  userId: string;
  displayName: string;
  email: string;
  role: 'OWNER' | 'STAFF';
  status: 'ACTIVE' | 'REMOVED';
}

export interface AdminOrg {
  id: string;
  name: string;
  ownerUserId: string;
  seatLimit: number;
  createdAt: string;
}

export interface AdminUser {
  userId: string;
  email: string;
  displayName: string;
  role: string;
  isPremium: boolean;
  level: number;
  centreId: string | null;
  createdAt: string | null;
}

export interface AdminInvite {
  token: string;
  centreName: string;
  contactEmail: string;
  createdBy: string;
  acceptedBy: string | null;
  orgId: string | null;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
}

export interface AvatarsResponse { data: { avatars: Avatar[] } }
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

// ── Mochi avatar customiser ──────────────────────────────────────────────
/** A fully-described Mochi look. Rendered by `MochiAvatar` from the single
 *  base PNG (`/mochi-base-transparent.png`) recoloured via CSS filters, with
 *  code-generated SVG overlays for accessory and aura.
 *
 *  The base PNG already has eyes and cheeks baked in, so the customiser only
 *  controls body colour, accessory and aura. */
export interface MochiConfig {
  /** Index into BODY_VARIANTS — body colour (hue/saturation/brightness filter). */
  body: number;
  /** Head accessory. */
  accessory: MochiAccessory;
  /** Ambient aura effect. */
  aura: MochiAura;
}

export type MochiAccessory =
  | 'none'
  | 'bow'
  | 'cap'
  | 'glasses'
  | 'crown'
  | 'headband';
export type MochiAura =
  | 'none'
  | 'sparkle'
  | 'fire'
  | 'chill'
  | 'electric'
  | 'bloom';

/** CSS filter recipes that recolour the pale-yellow base PNG. 12 variants. */
export const BODY_VARIANTS: ReadonlyArray<{
  name: string;
  filter: string;
}> = [
  { name: 'Butter',     filter: 'hue-rotate(0deg) saturate(1) brightness(1)' },
  { name: 'Peach',      filter: 'hue-rotate(-22deg) saturate(1.25) brightness(1.02)' },
  { name: 'Coral',      filter: 'hue-rotate(-38deg) saturate(1.6) brightness(0.98)' },
  { name: 'Rose',       filter: 'hue-rotate(-60deg) saturate(1.4) brightness(1)' },
  { name: 'Bubblegum',  filter: 'hue-rotate(-85deg) saturate(1.5) brightness(1.04)' },
  { name: 'Lilac',      filter: 'hue-rotate(220deg) saturate(1.2) brightness(1.02)' },
  { name: 'Periwinkle', filter: 'hue-rotate(190deg) saturate(1.3) brightness(1)' },
  { name: 'Sky',        filter: 'hue-rotate(160deg) saturate(1.35) brightness(1.02)' },
  { name: 'Mint',       filter: 'hue-rotate(95deg) saturate(1.2) brightness(1.02)' },
  { name: 'Matcha',     filter: 'hue-rotate(60deg) saturate(1.25) brightness(0.98)' },
  { name: 'Sand',       filter: 'hue-rotate(18deg) saturate(0.8) brightness(1)' },
  { name: 'Slate',      filter: 'hue-rotate(200deg) saturate(0.4) brightness(0.92)' },
];

/** Preview swatch hex for each body variant (1:1 with BODY_VARIANTS). */
export const BODY_PREVIEW_HEX: ReadonlyArray<string> = [
  '#F5E27A', // Butter
  '#F7C98C', // Peach
  '#F59E84', // Coral
  '#F08CA8', // Rose
  '#F58CC9', // Bubblegum
  '#C8A8F5', // Lilac
  '#A8B4F5', // Periwinkle
  '#8CCBF5', // Sky
  '#8CE0B4', // Mint
  '#A8D08C', // Matcha
  '#E0CFA8', // Sand
  '#9AA3B4', // Slate
];

const MOCHI_ACCESSORIES: ReadonlyArray<MochiAccessory> = [
  'none', 'bow', 'cap', 'glasses', 'crown', 'headband',
];
const MOCHI_AURAS: ReadonlyArray<MochiAura> = [
  'none', 'sparkle', 'fire', 'chill', 'electric', 'bloom',
];

/** The default Mochi — plain butter body, no extras. */
export const DEFAULT_MOCHI_CONFIG: MochiConfig = {
  body: 0,
  accessory: 'none',
  aura: 'none',
};

function pick<T>(arr: ReadonlyArray<T>): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Returns a random, always in-range MochiConfig. */
export function randomMochiConfig(): MochiConfig {
  return {
    body: Math.floor(Math.random() * BODY_VARIANTS.length),
    accessory: pick(MOCHI_ACCESSORIES),
    aura: pick(MOCHI_AURAS),
  };
}

// ── Admin leads & org billing ────────────────────────────────────────────
export type LeadRow = {
  id: string;
  orgName: string;
  contactName: string;
  email: string;
  phone: string;
  segment: string;
  estClasses: number | null;
  estStudents: number | null;
  status: string;
  orgId: string | null;
  notes: string | null;
  createdAt: string;
};

export type OrgBillingDetail = {
  orgId: string;
  name: string;
  tier: string;
  subStatus: string;
  pilotEndsAt: string | null;
  classesUsed: number;
  classLimit: number;
  classStudentCap: number;
  termsAccepted: boolean;
  termsAcceptedAt: string | null;
  perClass: {
    classId: string;
    className: string;
    studentsLinked: number;
    studentCap: number;
  }[];
};

// ── Classes (first-class units) ──────────────────────────────────────────
export interface OrgClass {
  id: string;
  name: string;
  subject: string | null;
  level: string | null;
  joinCode: string;
  corpusAvatarId: string | null;
  characterType: string;
  brandName: string | null;
  accentColor: string | null;
  examDate: string | null;
  cosmeticEyewear: string | null;
  cosmeticClothes: string | null;
  cosmeticShoes: string | null;
  studentCount: number;
  /** Class Mochi look — present once a centre admin has saved a custom avatar. */
  mochiConfig?: MochiConfig;
}

export interface CentreMember {
  userId: string;
  displayName: string;
  classes: Array<{ classId: string; className: string }>;
  unassigned: boolean;
}

export interface ClassRosterStudent {
  userId: string;
  displayName: string;
  avatarId: string;
}

export interface ClassRosterAnalyticsRow {
  studentId: string;
  displayName: string;
  grasp: number;
  attempts: number;
  lastActive: string | null;
}

export interface ClassModule {
  moduleId: string;
  title: string;
  wikiSlug: string;
  stage: string;
  studentCount: number;
  completedCount: number;
  avgMastery: number;
}

export interface ConceptMasteryData {
  students: Array<{ id: string; displayName: string; initials: string }>;
  concepts: string[];
  cells: Array<Array<number | null>>;
  weakest: Array<{ concept: string; avg: number }>;
}

export interface NarrationSegment {
  cardIndex: number;
  scriptText: string;
  audioUrl: string;
  durationMs: number;
}

export interface NarrationData {
  id: string;
  status: 'GENERATING' | 'READY' | 'FAILED';
  voiceId: string;
  totalDurationMs: number;
  segments: NarrationSegment[];
}

export interface CreateClassBody {
  name: string;
  subject?: string;
  level?: string;
  characterType?: string;
  brandName?: string;
  accentColor?: string;
  examDate?: string;
}

// ── Assignments ──────────────────────────────────────────────────────
export type AssignmentType = 'PRE_CLASS' | 'POST_CLASS' | 'REVISION' | 'CUSTOM';
export type AssignmentStudentStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';

export interface AssignmentSummary {
  id: string;
  title: string;
  type: AssignmentType;
  dueDate: string | null;
  completedCount: number;
  totalStudents: number;
  overdueCount: number;
}

export interface AssignmentStudentRow {
  userId: string;
  displayName: string;
  status: AssignmentStudentStatus;
  score: number | null;
}

export interface AssignmentDetail extends AssignmentSummary {
  moduleIds: string[];
  stages: string[];
  masteryThreshold: number | null;
  perStudentStatus: AssignmentStudentRow[];
}

export interface CreateAssignmentBody {
  title: string;
  type: AssignmentType;
  moduleIds: string[];
  stages?: string[];
  masteryThreshold?: number;
  dueDate?: string;
}

// ── Model answers & release ──────────────────────────────────────────
/** Returned by the model-answer + release endpoints. The model answer may be a
 *  JSON object (e.g. per-PROVE-question map) or a plain string. */
export interface AssignmentAnswerState {
  modelAnswer: unknown;
  answersReleased: boolean;
  answersReleasedAt: string | null;
}

export interface ReleaseAnswersBody {
  releaseNow?: boolean;
  releaseAt?: string;
}

// ── Muddiest point ───────────────────────────────────────────────────
export interface MuddiestPoint {
  conceptId: string;
  conceptLabel: string;
  count: number;
}

// ── Challenges ───────────────────────────────────────────────────────
export interface Challenge {
  id: string;
  classId: string;
  question: string;
  options?: string[] | null;
  /** Correct answer — only present on revealed challenges. */
  answer?: string | null;
  revealAt: string;
  /** Optional response distribution, present on revealed challenges when available. */
  distribution?: Array<{ option: string; count: number }> | null;
}

export interface CreateChallengeBody {
  question: string;
  options?: string[];
  answer: string;
  revealAt: string;
}

// ── Content Review ───────────────────────────────────────────────────
export type ReviewItemStatus = 'DRAFT' | 'APPROVED' | 'REJECTED';

export interface ReviewItem {
  itemId: string;
  moduleTitle: string;
  pageSlug: string | null;
  type: string;
  contentJson: string;
  answerJson?: string;
  status: ReviewItemStatus;
}

// ── AI Class Report ──────────────────────────────────────────────────
export interface ClassReport {
  narrative: string;
  cached: boolean;
  generatedAt: string;
}

// ── AI Class Brief ───────────────────────────────────────────────────
export interface ClassBriefFocusConcept {
  name: string;
  failRate: number;
  failingStudents: string[];
}

export interface SafetyFlagDto {
  id: string;
  category: string;
  severity: string;
  snippet: string | null;
  source: string;
  createdAt: string;
  messageId: string | null;
  avatarId: string | null;
}

export interface ClassBriefData {
  openWith: string;
  focusConcepts: ClassBriefFocusConcept[];
  checkOn: string[];
  suggestedGroups: string[][];
  skipLine: string | null;
}

// ── Exam Readiness ───────────────────────────────────────────────────
export interface ExamReadinessConcept {
  concept: string;
  avgMastery: number;
}

export interface ExamReadiness {
  avgReadiness: number;
  studentsBelow60: number;
  totalStudents: number;
  concepts: ExamReadinessConcept[];
}

// ── API methods ────────────────────────────────────────────────────────
export const api = {
  // Demo / lead capture
  demoRequest: (body: { orgName: string; contactName: string; email: string; phone: string }) =>
    apiFetch<{ data: { ok: boolean } }>('/demo-request', {
      method: 'POST',
      skipAuth: true,
      body: JSON.stringify(body),
    }),

  // Auth
  login: (email: string, password: string) =>
    apiFetch<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      skipAuth: true,
    }),

  // Google social sign-in/sign-up. `idToken` is the credential JWT returned by
  // the Google Identity Services button (CredentialResponse.credential).
  // Persists auth the same way as login — call saveAuth() on the result.
  google: (idToken: string) =>
    apiFetch<LoginResponse>('/auth/google', {
      method: 'POST',
      skipAuth: true,
      body: JSON.stringify({ idToken }),
    }),

  // Self-serve email sign-up. Only email + password are required; displayName
  // is optional and can be set later in account settings.
  register: (email: string, password: string, displayName?: string) =>
    apiFetch<LoginResponse>('/auth/register', {
      method: 'POST',
      skipAuth: true,
      body: JSON.stringify({ email, password, ...(displayName ? { displayName } : {}) }),
    }),

  getMe: () => apiFetch<MeResponse>('/auth/me'),

  getInvite: (token: string) =>
    apiFetch<{ data: { centreName: string; role: string } }>(
      `/auth/invite/${token}`,
      { skipAuth: true }
    ),

  acceptInvite: (token: string) =>
    apiFetch<{ data: { orgId: string; orgName: string; created: boolean } }>(
      '/auth/accept-invite',
      { method: 'POST', body: JSON.stringify({ token }) }
    ),

  // Self-serve centre creation — the authenticated caller becomes the owner.
  onboardCentre: (centreName: string) =>
    apiFetch<{ data: { orgId: string; orgName: string; alreadyOwned: boolean } }>(
      '/centre/onboard',
      { method: 'POST', body: JSON.stringify({ centreName }) }
    ),

  // Mint a student enroll code for the centre.
  mintEnrollCode: (orgId: string, cohortLabel: string, seats: number) =>
    apiFetch<{ data: { code: string; cohortLabel: string; maxUses: number; expiresAt: string } }>(
      `/centre/organizations/${orgId}/enroll-code`,
      { method: 'POST', body: JSON.stringify({ cohortLabel, seats }) }
    ),

  // Avatars (Mochis)
  avatars: () => apiFetch<AvatarsResponse>('/avatars'),
  avatar: (id: string) => apiFetch<AvatarResponse>(`/avatars/${id}`),

  // Create a Mochi — same contract as the mobile app (name + subject + character).
  createAvatar: (body: {
    name: string;
    subject: string;
    characterType: string;
    gradeLevel?: string;
  }) =>
    apiFetch<AvatarResponse>('/avatars', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // Manually trigger a wiki recompile (mobile fires this after every upload).
  recompile: (avatarId: string) =>
    apiFetch<{ data: Record<string, unknown> }>(
      `/avatars/${avatarId}/wiki/recompile`,
      { method: 'POST' }
    ),

  // Centre-Mochi-aware avatar list: returns all, centreManaged ones are ABC Mochi
  centreAvatars: async (): Promise<Avatar[]> => {
    const res = await apiFetch<AvatarsResponse>('/avatars');
    return (res.data?.avatars ?? []).filter((a) => a.centreManaged);
  },

  // Knowledge / wiki
  wikiPages: (avatarId: string) =>
    apiFetch<WikiPagesResponse>(`/avatars/${avatarId}/wiki/pages`),

  files: (avatarId: string) =>
    apiFetch<FilesResponse>(`/avatars/${avatarId}/files`),

  // Upload — multipart, no Content-Type header (browser sets boundary).
  // skipRelevance mirrors the mobile "Add Anyway" path.
  uploadFile: async (
    avatarId: string,
    file: File,
    opts?: { skipRelevance?: boolean }
  ): Promise<UploadResponse> => {
    const form = new FormData();
    form.append('file', file);
    if (opts?.skipRelevance) form.append('skipRelevance', 'true');
    const token = getToken();

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3 * 60_000);

    let res: Response;
    try {
      res = await fetch(`${BASE}/avatars/${avatarId}/files`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
        signal: controller.signal,
      });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new ApiError(0, 'TIMEOUT', 'Upload timed out — please try a smaller file or check your connection.', true);
      }
      throw new ApiError(0, 'NETWORK', 'You appear to be offline. Check your connection.', true);
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok) {
      const text = await res.text();
      throw statusToApiError(res.status, text);
    }

    return res.json() as Promise<UploadResponse>;
  },

  // Relevance check before upload — backend expects `contentSample` (matches
  // the mobile app; the previous `text` field failed @NotBlank validation).
  checkRelevance: (avatarId: string, contentSample: string) =>
    apiFetch<RelevanceResponse>(`/avatars/${avatarId}/relevance`, {
      method: 'POST',
      body: JSON.stringify({ contentSample }),
    }),

  // Usage / quota
  usageToday: () => apiFetch<UsageResponse>('/usage/today'),

  // Delete a knowledge file
  deleteFile: (avatarId: string, fileId: string) =>
    apiFetch<void>(`/avatars/${avatarId}/files/${fileId}`, { method: 'DELETE' }),

  // Centre me (orgId resolver)
  centreMe: () =>
    apiFetch<{ data: { orgId: string; orgName: string; seatsUsed: number; seatLimit: number; cohorts: string[] } }>(
      '/centre/me'
    ),

  // Analytics
  overview: (orgId: string, cohort?: string) =>
    apiFetch<{ data: OverviewData }>(
      `/centre/organizations/${orgId}/overview${cohort ? `?cohort=${encodeURIComponent(cohort)}` : ''}`
    ),

  // Legacy cohort-based summary (renamed from /classes → /cohorts on the
  // backend now that classes are first-class). Kept for backward compat.
  cohorts: (orgId: string) =>
    apiFetch<{ data: Array<{ cohort: string; studentCount: number; avgGrasp: number }> }>(
      `/centre/organizations/${orgId}/cohorts`
    ),

  // Legacy cohort heatmap.
  cohortHeatmap: (orgId: string, cohort: string) =>
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

  // ── Classes (first-class units) ────────────────────────────────────────
  classes: (orgId: string) =>
    apiFetch<{ data: OrgClass[] }>(`/centre/organizations/${orgId}/classes`),

  createClass: (orgId: string, body: CreateClassBody) =>
    apiFetch<{ data: OrgClass }>(`/centre/organizations/${orgId}/classes`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  updateClass: (orgId: string, classId: string, body: Partial<CreateClassBody>) =>
    apiFetch<{ data: OrgClass }>(`/centre/organizations/${orgId}/classes/${classId}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  // Save the class Mochi look. Body is the full MochiConfig.
  setMochiConfig: (orgId: string, classId: string, cfg: MochiConfig) =>
    apiFetch<{ data: OrgClass }>(
      `/centre/organizations/${orgId}/classes/${classId}/mochi-config`,
      { method: 'PATCH', body: JSON.stringify(cfg) }
    ),

  // Teaching style for a class — owner-gated; the backend writes it onto the
  // class corpus avatar's teacherPreferences (already injected into the tutor
  // system prompt) and applies it to every student's Mochi in the class. (The
  // student /avatars/{id}/teacher-preferences path rejects class avatars.)
  setClassTeachingStyle: (orgId: string, classId: string, teacherPreferences: string) =>
    apiFetch<{ data: { teacherPreferences: string } }>(
      `/centre/organizations/${orgId}/classes/${classId}/teaching-style`,
      { method: 'PATCH', body: JSON.stringify({ teacherPreferences }) }
    ),

  // All centre members + their class memberships + unassigned flag.
  members: (orgId: string) =>
    apiFetch<{ data: CentreMember[] }>(`/centre/organizations/${orgId}/members`),

  assignMember: (orgId: string, classId: string, userId: string) =>
    apiFetch<{ data: { avatarId: string; classId: string; userId: string } }>(
      `/centre/organizations/${orgId}/classes/${classId}/members`,
      { method: 'POST', body: JSON.stringify({ userId }) }
    ),

  removeMember: (orgId: string, classId: string, studentId: string) =>
    apiFetch<{ data: { removed: boolean } }>(
      `/centre/organizations/${orgId}/classes/${classId}/members/${studentId}`,
      { method: 'DELETE' }
    ),

  classRoster: (orgId: string, classId: string) =>
    apiFetch<{ data: ClassRosterStudent[] }>(
      `/centre/organizations/${orgId}/classes/${classId}/members`
    ),

  classRosterAnalytics: (orgId: string, classId: string) =>
    apiFetch<{ data: ClassRosterAnalyticsRow[] }>(
      `/centre/organizations/${orgId}/classes/${classId}/analytics/roster`
    ),

  classHeatmap: (orgId: string, classId: string) =>
    apiFetch<{ data: HeatmapData }>(
      `/centre/organizations/${orgId}/classes/${classId}/analytics/heatmap`
    ),

  classModules: (orgId: string, classId: string) =>
    apiFetch<{ data: ClassModule[] }>(
      `/centre/organizations/${orgId}/classes/${classId}/modules`
    ),

  classConceptMastery: (orgId: string, classId: string) =>
    apiFetch<{ data: ConceptMasteryData }>(
      `/centre/organizations/${orgId}/classes/${classId}/concept-mastery`
    ),

  // ── Narration ──────────────────────────────────────────────────────────
  generateNarration: (orgId: string, classId: string, moduleId: string) =>
    apiFetch<{ data: { narrationId: string } }>(
      `/centre/organizations/${orgId}/classes/${classId}/modules/${moduleId}/narration/generate`,
      { method: 'POST' }
    ),

  getNarration: (orgId: string, classId: string, moduleId: string) =>
    apiFetch<{ data: NarrationData | null }>(
      `/centre/organizations/${orgId}/classes/${classId}/modules/${moduleId}/narration`
    ),

  // ── Assignments ──────────────────────────────────────────────────────
  assignments: (orgId: string, classId: string) =>
    apiFetch<{ data: AssignmentSummary[] }>(
      `/centre/organizations/${orgId}/classes/${classId}/assignments`
    ),

  createAssignment: (orgId: string, classId: string, body: CreateAssignmentBody) =>
    apiFetch<{ data: AssignmentDetail }>(
      `/centre/organizations/${orgId}/classes/${classId}/assignments`,
      { method: 'POST', body: JSON.stringify(body) }
    ),

  assignment: (orgId: string, classId: string, assignmentId: string) =>
    apiFetch<{ data: AssignmentDetail }>(
      `/centre/organizations/${orgId}/classes/${classId}/assignments/${assignmentId}`
    ),

  deleteAssignment: (orgId: string, classId: string, assignmentId: string) =>
    apiFetch<void>(
      `/centre/organizations/${orgId}/classes/${classId}/assignments/${assignmentId}`,
      { method: 'DELETE' }
    ),

  // ── Model answers & release ────────────────────────────────────────
  // modelAnswer may be an object (per-PROVE-question map) or a plain string.
  setModelAnswer: (orgId: string, classId: string, assignmentId: string, modelAnswer: unknown) =>
    apiFetch<{ data: AssignmentAnswerState }>(
      `/centre/organizations/${orgId}/classes/${classId}/assignments/${assignmentId}/model-answer`,
      { method: 'PUT', body: JSON.stringify({ modelAnswer }) }
    ),

  // Release answers: { releaseNow: true } | { releaseAt: '<iso>' } | {} (defaults to dueDate).
  releaseAnswers: (orgId: string, classId: string, assignmentId: string, body: ReleaseAnswersBody) =>
    apiFetch<{ data: AssignmentAnswerState }>(
      `/centre/organizations/${orgId}/classes/${classId}/assignments/${assignmentId}/release`,
      { method: 'POST', body: JSON.stringify(body) }
    ),

  // ── Muddiest point ─────────────────────────────────────────────────
  muddiest: (classId: string, moduleId: string) =>
    apiFetch<MuddiestPoint[]>(
      `/classes/${classId}/muddiest?moduleId=${encodeURIComponent(moduleId)}`
    ),

  // ── Challenges ─────────────────────────────────────────────────────
  createChallenge: (orgId: string, classId: string, body: CreateChallengeBody) =>
    apiFetch<{ id: string; classId: string; revealAt: string }>(
      `/centre/organizations/${orgId}/classes/${classId}/challenges`,
      { method: 'POST', body: JSON.stringify(body) }
    ),

  listChallenges: (classId: string) =>
    apiFetch<Challenge[]>(`/classes/${classId}/challenges`),

  // ── Content Review ─────────────────────────────────────────────────
  contentReview: (orgId: string, classId: string) =>
    apiFetch<{ data: ReviewItem[] }>(
      `/centre/organizations/${orgId}/classes/${classId}/content/review`
    ),

  patchContentItem: (orgId: string, classId: string, itemId: string, body: { status?: string; contentJson?: string; answerJson?: string }) =>
    apiFetch<{ data: ReviewItem }>(
      `/centre/organizations/${orgId}/classes/${classId}/content/${itemId}`,
      { method: 'PATCH', body: JSON.stringify(body) }
    ),

  approveAllContent: (orgId: string, classId: string) =>
    apiFetch<{ data: { approvedCount: number } }>(
      `/centre/organizations/${orgId}/classes/${classId}/content/approve-all`,
      { method: 'POST' }
    ),

  regenerateContent: (orgId: string, classId: string, pageSlug: string, guidance?: string) =>
    apiFetch<{ data: { pageSlug: string; moduleId: string; regenerated: boolean } }>(
      `/centre/organizations/${orgId}/classes/${classId}/content/${encodeURIComponent(pageSlug)}/regenerate`,
      { method: 'POST', body: JSON.stringify(guidance ? { guidance } : {}) }
    ),

  // ── AI Class Report ────────────────────────────────────────────────
  classReport: (orgId: string, classId: string) =>
    apiFetch<{ data: ClassReport }>(
      `/centre/organizations/${orgId}/classes/${classId}/report`
    ),

  // ── Exam Readiness ─────────────────────────────────────────────────
  examReadiness: (orgId: string, classId: string) =>
    apiFetch<{ data: ExamReadiness }>(
      `/centre/organizations/${orgId}/classes/${classId}/exam-readiness`
    ),

  // ── AI Class Brief ─────────────────────────────────────────────────
  classBrief: (orgId: string, classId: string, moduleId?: string) =>
    apiFetch<{ data: ClassBriefData }>(
      `/centre/organizations/${orgId}/classes/${classId}/class-brief${moduleId ? `?moduleId=${encodeURIComponent(moduleId)}` : ''}`
    ),

  refreshClassBrief: (orgId: string, classId: string, moduleId?: string) =>
    apiFetch<{ data: ClassBriefData }>(
      `/centre/organizations/${orgId}/classes/${classId}/class-brief/refresh${moduleId ? `?moduleId=${encodeURIComponent(moduleId)}` : ''}`,
      { method: 'POST' }
    ),

  // ── Admin safety review (email-link-driven, no JWT) ───────────────
  getSafetyFlags: (childUserId: string, sinceHours: number, adminSecret: string) =>
    apiFetch<{ data: SafetyFlagDto[] }>(
      `/admin/safety-flags?childUserId=${encodeURIComponent(childUserId)}&sinceHours=${sinceHours}`,
      { skipAuth: true, headers: { 'X-Admin-Secret': adminSecret } }
    ),

  // ── Platform admin ────────────────────────────────────────────────
  adminOrgs: () =>
    apiFetch<{ data: AdminOrg[] }>('/admin/organizations'),

  adminUsers: (page = 0, size = 50) =>
    apiFetch<{ data: AdminUser[] }>(`/admin/users?page=${page}&size=${size}`),

  adminInvites: () =>
    apiFetch<{ data: AdminInvite[] }>('/admin/invites'),

  adminCreateInvite: (centreName: string, contactEmail: string) =>
    apiFetch<{ data: { token: string; centreName: string; contactEmail: string; expiresAt: string } }>(
      '/admin/invites',
      { method: 'POST', body: JSON.stringify({ centreName, contactEmail }) }
    ),

  // ── Staff management ─────────────────────────────────────────────
  listStaff: (orgId: string) =>
    apiFetch<{ data: OrgStaffMember[] }>(`/centre/${orgId}/staff`),

  inviteStaff: (orgId: string, email: string) =>
    apiFetch<{ data: { attached: boolean; token?: string; userId?: string; email: string; expiresAt?: string } }>(
      `/centre/${orgId}/staff/invite`,
      { method: 'POST', body: JSON.stringify({ email }) }
    ),

  removeStaff: (orgId: string, staffUserId: string) =>
    apiFetch<{ data: { removed: boolean } }>(
      `/centre/${orgId}/staff/${staffUserId}`,
      { method: 'DELETE' }
    ),

  // ── File Review (OCR quality gate) ────────────────────────────────
  reviewFile: (avatarId: string, fileId: string, action: 'APPROVE' | 'EDIT', editedText?: string) =>
    apiFetch<{ data: Record<string, unknown> }>(
      `/avatars/${avatarId}/files/${fileId}/review`,
      { method: 'PATCH', body: JSON.stringify({ action, ...(editedText ? { editedText } : {}) }) }
    ),

  // ── Consumer billing (Stripe) ─────────────────────────────────────
  subscriptionStatus: () =>
    apiFetch<{ data: Record<string, unknown> }>('/subscription/status'),

  entitlement: () =>
    apiFetch<{ data: { isPremium: boolean; source: string; plan: string; status: string; trialEndsAt: string | null } }>(
      '/subscription/entitlement'
    ),

  checkout: (plan: string) =>
    apiFetch<{ data: { checkoutUrl: string } }>(
      '/subscription/checkout',
      { method: 'POST', body: JSON.stringify({ plan }) }
    ),

  billingPortal: () =>
    apiFetch<{ data: { portalUrl: string } }>(
      '/subscription/portal',
      { method: 'POST' }
    ),

  // ── Admin leads ───────────────────────────────────────────────────────
  adminListLeads: () =>
    apiFetch<{ data: LeadRow[] }>('/admin/leads'),

  adminUpdateLeadStatus: (id: string, status: string, notes?: string) =>
    apiFetch<{ data: null }>(`/admin/leads/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, ...(notes !== undefined ? { notes } : {}) }),
    }),

  adminProvisionPilot: (leadId: string, body: { orgId: string; tier: string; classLimit: number }) =>
    apiFetch<{ data: { orgId: string } }>(`/admin/leads/${leadId}/provision`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  // ── Admin org billing ─────────────────────────────────────────────────
  adminOrgBillingDetail: (orgId: string) =>
    apiFetch<{ data: OrgBillingDetail }>(`/admin/orgs/${orgId}/billing-detail`),

  adminActivateOrg: (orgId: string, billingRef: string) =>
    apiFetch<{ data: null }>(`/admin/orgs/${orgId}/activate`, {
      method: 'POST',
      body: JSON.stringify({ billingRef }),
    }),

  adminExpireOrg: (orgId: string) =>
    apiFetch<{ data: null }>(`/admin/orgs/${orgId}/expire`, {
      method: 'POST',
    }),
};

// ── Character helpers ──────────────────────────────────────────────────

/** Maps a characterType from the API to a display emoji (fallback 🐾). */
export function characterEmoji(characterType: string): string {
  const map: Record<string, string> = {
    MOCHI: '🐻', PENCIL: '✏️', SCIENCE: '🔬', PE: '⚽',
    ART: '🎨', LUNCHBOX: '🍱', LIBRARY: '📚', HEADMASTER: '🎩',
    GOLDSTAR: '⭐',
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
