import { redirect } from 'next/navigation';

/**
 * Self-serve signup is CLOSED — the web app is teacher/centre-facing and
 * invite-only. This route is kept (rather than deleted) so existing links,
 * bookmarks and search results land somewhere useful instead of a 404.
 *
 * The page is not the gate: {@code /auth/register} and the social create branch
 * are refused server-side too, and {@code /centre/onboard} is ADMIN-gated.
 * Removing this page alone would not have removed signup.
 *
 * Mobile is unaffected — direct consumer onboarding in the pally app stays open.
 */
export default function SignupPage() {
  redirect('/demo');
}
