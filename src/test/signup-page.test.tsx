import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Router — the page calls router.replace() after a successful sign-up.
const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
}));

// Google sign-in is gated off (no client ID) in tests, but stub the component
// + helper defensively so the static import tree resolves.
vi.mock('@react-oauth/google', () => ({
  GoogleLogin: () => null,
}));
vi.mock('@/lib/google', () => ({ isGoogleEnabled: false }));

// Side-effect helpers fired in afterAuth — silence them.
vi.mock('@/lib/auth', () => ({ saveAuth: vi.fn() }));
vi.mock('@/lib/analytics', () => ({ identify: vi.fn(), trackEvent: vi.fn() }));

// The register API call — the unit under capture. Keep ApiError real so the
// page's `err instanceof ApiError` branch still type-checks against it.
vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    api: { ...actual.api, register: vi.fn() },
  };
});

import { api } from '@/lib/api';
import SignupPage from '@/app/signup/page';

const mockedRegister = vi.mocked(api.register);
const CURRENT_YEAR = new Date().getFullYear();
const UNDER_13_YEAR = String(CURRENT_YEAR - 8); // age 8 → under 13
const ADULT_YEAR = String(CURRENT_YEAR - 30);   // age 30 → 13+

async function openEmailForm(user: ReturnType<typeof userEvent.setup>) {
  render(<SignupPage />);
  await user.click(screen.getByRole('button', { name: /Continue with email/i }));
}

async function fillBase(user: ReturnType<typeof userEvent.setup>, year: string) {
  await user.type(screen.getByLabelText(/Email address/i), 'kid@example.com');
  await user.type(screen.getByLabelText(/^Password/i), 'supersecret');
  await user.type(screen.getByLabelText(/Your birth year/i), year);
}

describe('SignupPage — under-13 branch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedRegister.mockResolvedValue({ data: { token: 't', userId: 'u' } });
  });

  it('(a) a young birth year reveals the parent-email field and blocks submit until it is filled', async () => {
    const user = userEvent.setup();
    await openEmailForm(user);

    // No parent field before a birth year is entered.
    expect(screen.queryByLabelText(/Parent\/guardian email/i)).not.toBeInTheDocument();

    await fillBase(user, UNDER_13_YEAR);

    // Under-13 birth year reveals the parent-email field + the explanatory note.
    const parentField = await screen.findByLabelText(/Parent\/guardian email/i);
    expect(parentField).toBeInTheDocument();
    expect(screen.getByText(/Because you're under 13/i)).toBeInTheDocument();

    // Submitting with the parent field empty is blocked (inline error, no call).
    await user.click(screen.getByRole('button', { name: /Create account/i }));
    expect(await screen.findByText(/valid parent\/guardian email/i)).toBeInTheDocument();
    expect(mockedRegister).not.toHaveBeenCalled();
  });

  it('(b) an under-13 sign-up sends birthYear AND parentEmail to register', async () => {
    const user = userEvent.setup();
    await openEmailForm(user);
    await fillBase(user, UNDER_13_YEAR);

    await user.type(
      await screen.findByLabelText(/Parent\/guardian email/i),
      'parent@example.com'
    );
    await user.click(screen.getByRole('button', { name: /Create account/i }));

    await waitFor(() => expect(mockedRegister).toHaveBeenCalledTimes(1));
    expect(mockedRegister).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'kid@example.com',
        password: 'supersecret',
        birthYear: CURRENT_YEAR - 8,
        parentEmail: 'parent@example.com',
      })
    );
  });

  it('(c) a 13+ birth year submits with birthYear and WITHOUT parentEmail', async () => {
    const user = userEvent.setup();
    await openEmailForm(user);
    await fillBase(user, ADULT_YEAR);

    // No parent field for an adult.
    expect(screen.queryByLabelText(/Parent\/guardian email/i)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /Create account/i }));

    await waitFor(() => expect(mockedRegister).toHaveBeenCalledTimes(1));
    const arg = mockedRegister.mock.calls[0][0];
    expect(arg.birthYear).toBe(CURRENT_YEAR - 30);
    expect(arg.parentEmail).toBeUndefined();
  });
});
