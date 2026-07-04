/**
 * The single source of truth for the API origin, shared by api.ts and review-api.ts
 * so their defaults can never diverge.
 *
 * INVARIANT: the code default MUST be a host that is verified live and serving —
 * a cleared NEXT_PUBLIC_API_URL falls back to this, so pointing it at an unverified
 * host would brick login (this happened once). Both railway.app and api.apalchi.com
 * are live today; we default to the long-proven railway host. The same-site cutover
 * to api.apalchi.com is driven by the Vercel NEXT_PUBLIC_API_URL var; rollback =
 * revert that one var.
 */
export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ??
  'https://pallybackend-production.up.railway.app/api/v1';
