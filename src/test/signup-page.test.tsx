import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * REWRITTEN, NOT DELETED. This file used to exercise the self-serve signup form
 * (email/password + Google + org creation). Self-serve signup is CLOSED — the web
 * app is teacher/centre-facing and invite-only — so the form is gone and the route
 * now redirects to the Request-a-Demo page.
 *
 * The file is kept because the ROUTE still matters: existing links, bookmarks and
 * search results point at /signup, and they must land somewhere useful rather than
 * 404. Deleting the test would leave that behaviour unpinned.
 *
 * Note the page is NOT the gate. /auth/register is refused server-side (403), the
 * social create branch is refused, and /centre/onboard is ADMIN-gated. A test that
 * only asserted this redirect would prove very little on its own — the real
 * closures are pinned in the backend suite (SelfServeSignupClosedTest).
 */
const redirect = vi.fn();
vi.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => redirect(...args),
}));

describe('/signup', () => {
  beforeEach(() => {
    redirect.mockClear();
  });

  it('redirects to the Request a Demo page instead of creating an account', async () => {
    const { default: SignupPage } = await import('@/app/signup/page');

    SignupPage();

    expect(redirect).toHaveBeenCalledWith('/demo');
  });

  it('renders no account-creation form', async () => {
    const mod = await import('@/app/signup/page');
    const source = mod.default.toString();

    // The page must not have quietly regrown a signup path.
    expect(source).not.toContain('register');
    expect(source).not.toContain('password');
  });
});
