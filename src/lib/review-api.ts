/**
 * Public review API — UNAUTHENTICATED.
 *
 * These endpoints back the public `/review/[token]` page that reviewers open
 * from a WhatsApp link on their phone. They must NOT attach the JWT from
 * localStorage (the dashboard token); the backend treats them as public and
 * scopes everything to the opaque single-use token in the URL.
 *
 * We deliberately do NOT reuse `apiFetch` from `@/lib/api` because that helper
 * attaches `Authorization: Bearer <token>` and triggers a /login redirect on
 * 401. Here we use a plain fetch and surface structured outcomes instead.
 */

// The configured base already ends in `/api/v1` (see .env.local), matching how
// every existing apiFetch path resolves (e.g. '/avatars' → '.../api/v1/avatars').
// Default to the Railway prod host (same as src/lib/api.ts) so the trusted-adult
// review flow works on apalchi.com without an explicit env — the old '' default
// only resolved locally and was a latent prod break.
const BASE =
  process.env.NEXT_PUBLIC_API_URL ??
  'https://pallybackend-production.up.railway.app/api/v1';

export interface ReviewContent {
  pageTitle: string;
  subject: string;
  contentMarkdown: string;
  status: string;
  createdAt: string;
}

/** Status string returned in a 410 body (expired / already reviewed / revoked). */
export type GoneStatus = string;

export type ReviewLoadResult =
  | { kind: 'ok'; content: ReviewContent }
  | { kind: 'gone'; status: GoneStatus }
  | { kind: 'notfound' }
  | { kind: 'network' }
  | { kind: 'error' };

export type RespondVerdict = 'APPROVE' | 'FLAG';

export type RespondResult =
  | { kind: 'ok'; status: 'APPROVED' | 'FLAGGED' }
  | { kind: 'conflict' } // already responded → 409
  | { kind: 'ratelimited' } // 429
  | { kind: 'gone'; status: GoneStatus } // link expired between load and submit
  | { kind: 'notfound' }
  | { kind: 'network' }
  | { kind: 'error' };

async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

function extractStatus(body: unknown): string {
  if (body && typeof body === 'object') {
    const data = (body as { data?: unknown }).data;
    if (data && typeof data === 'object') {
      const status = (data as { status?: unknown }).status;
      if (typeof status === 'string') return status;
    }
  }
  return '';
}

/** GET the review content for a token. */
export async function loadReview(token: string): Promise<ReviewLoadResult> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/review/${encodeURIComponent(token)}`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });
  } catch {
    return { kind: 'network' };
  }

  if (res.status === 200) {
    const body = await safeJson(res);
    const data =
      body && typeof body === 'object'
        ? (body as { data?: ReviewContent }).data
        : undefined;
    if (!data) return { kind: 'error' };
    return { kind: 'ok', content: data };
  }

  if (res.status === 410) {
    const body = await safeJson(res);
    return { kind: 'gone', status: extractStatus(body) };
  }

  if (res.status === 404) return { kind: 'notfound' };

  return { kind: 'error' };
}

export interface RespondBody {
  verdict: RespondVerdict;
  reviewerName?: string;
  note?: string;
}

/** POST a verdict for a token. */
export async function respondReview(
  token: string,
  body: RespondBody
): Promise<RespondResult> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/review/${encodeURIComponent(token)}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    return { kind: 'network' };
  }

  if (res.status === 200) {
    const parsed = await safeJson(res);
    const status = extractStatus(parsed);
    if (status === 'APPROVED' || status === 'FLAGGED') {
      return { kind: 'ok', status };
    }
    // Fall back to deriving from the verdict if the body shape is unexpected.
    return { kind: 'ok', status: body.verdict === 'APPROVE' ? 'APPROVED' : 'FLAGGED' };
  }

  if (res.status === 409) return { kind: 'conflict' };
  if (res.status === 429) return { kind: 'ratelimited' };
  if (res.status === 410) {
    const parsed = await safeJson(res);
    return { kind: 'gone', status: extractStatus(parsed) };
  }
  if (res.status === 404) return { kind: 'notfound' };

  return { kind: 'error' };
}
