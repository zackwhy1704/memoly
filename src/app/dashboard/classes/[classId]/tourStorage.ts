// Feature-tour persistence — per-user seen flag in localStorage (no server flag
// exists). Versioned (v1) so a deliberate copy change can bump the key and
// re-show once. userId comes from auth (persisted at login); falls back to
// 'anon' pre-auth so the key is always well-formed.

import { getUserId } from '@/lib/auth';

const TOUR_VERSION = 'v1';

export function tourSeenKey(userId: string | null): string {
  return `memoly_tour_${TOUR_VERSION}_${userId ?? 'anon'}`;
}

export function isTourSeen(): boolean {
  if (typeof window === 'undefined') return true; // never auto-show during SSR
  try {
    return localStorage.getItem(tourSeenKey(getUserId())) === '1';
  } catch {
    return true; // storage blocked → don't nag
  }
}

export function markTourSeen(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(tourSeenKey(getUserId()), '1');
  } catch {
    /* ignore */
  }
}

/** Re-arm the tour (Settings → Replay): it shows again on the next class visit. */
export function resetTour(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(tourSeenKey(getUserId()));
  } catch {
    /* ignore */
  }
}
