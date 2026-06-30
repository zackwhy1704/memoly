import type { MeResponse } from './api';

/**
 * Internal route prefixes that a `?redirect=` (returnTo) param may target after
 * login. Anything outside these prefixes is rejected — we never honour an
 * external URL or an arbitrary internal path from the query string.
 */
export const SAFE_PREFIXES = ['/account/', '/accept-invite/'] as const;

/**
 * Centralised four-door post-login routing.
 *
 * Behaviour:
 *  - A `returnTo` is honoured ONLY when it starts with a SAFE_PREFIX; otherwise
 *    it is ignored.
 *  - When no safe returnTo is present, route by identity:
 *      • role === 'ADMIN'      → '/admin'   (platform admin console)
 *      • isCentreStaff === true → '/dashboard' (centre owner/staff analytics)
 *      • otherwise (consumer)   → '/account'  (the consumer account + billing hub)
 *  - The consumer default is '/account' — a real account hub — NEVER a
 *    download/upgrade wall. The native app stays the product; the web is the
 *    account/billing control plane. A free consumer always lands somewhere with
 *    a working path to checkout (/account → /account/billing).
 *  - When `me` is null/undefined (the /me lookup failed or was skipped), fall
 *    back to '/dashboard' (centre staff are the most likely caller of a login
 *    form that loses /me).
 *
 * @param me        The /me response, or null when the lookup failed.
 * @param returnTo  The raw `?redirect=` query param (may be null/undefined).
 */
export function resolvePostLoginDest(
  me: MeResponse | null | undefined,
  returnTo?: string | null
): string {
  const safeReturn =
    returnTo && SAFE_PREFIXES.some((p) => returnTo.startsWith(p))
      ? returnTo
      : null;

  if (safeReturn) return safeReturn;

  // No safe returnTo → route by identity. A missing `me` means the lookup
  // failed: fall back to /dashboard (centre staff most likely).
  if (!me) return '/dashboard';

  if (me.data.role === 'ADMIN') return '/admin';
  if (me.data.isCentreStaff) return '/dashboard';
  return '/account';
}
