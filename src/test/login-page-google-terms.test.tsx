import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Router — resolveDest() takes the safe ?redirect= short-circuit so getMe() is never called.
const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
  useSearchParams: () => new URLSearchParams('redirect=/account/billing'),
}));

// Google is ENABLED here (opposite of signup-page.test.tsx) — this page's Google
// button can ALSO create a new account (register-or-login in one gesture), which
// is exactly the case the terms notice + acceptedTerms:true call cover.
vi.mock('@/lib/google', () => ({ isGoogleEnabled: true }));

vi.mock('@react-oauth/google', () => ({
  GoogleLogin: ({ onSuccess }: { onSuccess: (r: { credential: string }) => void }) => (
    <button onClick={() => onSuccess({ credential: 'header.payload.sig' })}>
      Mock Google Button
    </button>
  ),
}));

vi.mock('@/lib/auth', () => ({
  saveAuth: vi.fn(),
  saveLastEmail: vi.fn(),
  getLastEmail: () => null,
}));
vi.mock('@/lib/analytics', () => ({ identify: vi.fn(), trackEvent: vi.fn() }));

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      google: vi.fn(),
      getMe: vi.fn(),
    },
  };
});

import { api } from '@/lib/api';
import LoginPage from '@/app/(marketing)/login/page';

const mockedGoogle = vi.mocked(api.google);

describe('LoginPage — Google sign-in terms notice', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGoogle.mockResolvedValue({ data: { token: 'tok', userId: 'uid' } });
    // jsdom has no matchMedia — the page's reduced-motion check needs a stub.
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  it('still shows the terms notice next to the Google button', () => {
    render(<LoginPage />);
    expect(screen.getByText(/Terms of Use/i)).toBeInTheDocument();
    expect(screen.getByText(/zero tolerance/i)).toBeInTheDocument();
  });

  /**
   * REWRITTEN TO THE NEW CONTRACT, NOT WEAKENED TO PASS.
   *
   * This previously asserted acceptedTerms:TRUE. That hardcoded true was the defect:
   * api.ts explicitly warns "always pass the real checkbox state, never a hardcoded
   * true", and because /auth/google also CREATES an account for an unknown user, the
   * sign-in page could mint accounts while never mentioning signing up. Deleting the
   * /signup page alone would have left that path open.
   *
   * The login page shows no terms checkbox, so there is no affirmative acceptance to
   * report and the honest value is false. Self-serve signup is now refused
   * server-side as well, so the create branch is closed regardless — but the client
   * must not claim a consent nobody gave.
   */
  it('clicking the Google button reports acceptedTerms:false — the page has no checkbox to accept with', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.click(screen.getByText('Mock Google Button'));

    expect(mockedGoogle).toHaveBeenCalledWith('header.payload.sig', false);
  });
});
