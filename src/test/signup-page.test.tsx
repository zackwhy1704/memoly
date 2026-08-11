import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Router — the page calls router.replace() after a successful sign-up.
const replace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace }),
}));

// Google sign-in is gated off (no client ID) in tests.
vi.mock('@react-oauth/google', () => ({
  GoogleLogin: () => null,
}));
vi.mock('@/lib/google', () => ({ isGoogleEnabled: false }));

// Side-effect helpers fired in finishSetup — silence them.
vi.mock('@/lib/auth', () => ({ saveAuth: vi.fn() }));
vi.mock('@/lib/analytics', () => ({ identify: vi.fn(), trackEvent: vi.fn() }));

// Stub the API calls. Keep ApiError real so instanceof checks work.
vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      register: vi.fn(),
      onboardCentre: vi.fn(),
    },
  };
});

import { api } from '@/lib/api';
import SignupPage from '@/app/signup/page';

const mockedRegister = vi.mocked(api.register);
const mockedOnboard  = vi.mocked(api.onboardCentre);

function setup() {
  const user = userEvent.setup();
  render(<SignupPage />);
  return user;
}

async function fillProfile(user: ReturnType<typeof userEvent.setup>, opts: {
  name?: string; org?: string; phone?: string;
} = {}) {
  await user.type(screen.getByLabelText(/Your name/i), opts.name ?? 'Jane Smith');
  await user.type(screen.getByLabelText(/Centre \/ organisation name/i), opts.org ?? 'Bright Stars Tuition');
  await user.type(screen.getByLabelText(/Contact number/i), opts.phone ?? '+65 9000 0000');
}

async function fillEmailForm(user: ReturnType<typeof userEvent.setup>, opts: {
  email?: string; password?: string;
} = {}) {
  // When Google is disabled (as in tests), the email form renders immediately.
  // When Google is enabled, user must click "Continue with email" first.
  const continueBtn = screen.queryByRole('button', { name: /Continue with email/i });
  if (continueBtn) await user.click(continueBtn);
  await user.type(screen.getByLabelText(/Work email/i), opts.email ?? 'admin@bright.edu');
  await user.type(screen.getByLabelText(/Password/i), opts.password ?? 'securepassword');
}

// The Create account button is disabled until this is checked — every test that
// expects a real submit (register() to fire, or a validation error further down
// handleEmail) must check it first, same as filling any other required field.
async function checkTerms(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByLabelText(/agree to the Terms of Use/i));
}

describe('SignupPage — centre admin form', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedRegister.mockResolvedValue({ data: { token: 'tok', userId: 'uid' } });
    mockedOnboard.mockResolvedValue({ data: { orgId: 'org-1', orgName: 'Bright Stars', alreadyOwned: false } } as never);
  });

  it('renders name, org name, phone, and "Continue with email" — no birth year, no parent email', () => {
    setup();
    expect(screen.getByLabelText(/Your name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Centre \/ organisation name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Contact number/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/birth year/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/parent/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/guardian/i)).not.toBeInTheDocument();
  });

  it('shows work email + password fields (rendered immediately when Google disabled)', () => {
    setup();
    // When Google OAuth is off, the email form renders directly (no toggle needed).
    expect(screen.getByLabelText(/Work email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
  });

  it('blocks submit and shows error when name is missing', async () => {
    const user = setup();
    await fillEmailForm(user);
    await checkTerms(user);
    await user.click(screen.getByRole('button', { name: /Create account/i }));
    expect(await screen.findByText(/Please enter your name/i)).toBeInTheDocument();
    expect(mockedRegister).not.toHaveBeenCalled();
  });

  it('blocks submit and shows error when org name is missing', async () => {
    const user = setup();
    await user.type(screen.getByLabelText(/Your name/i), 'Jane');
    await fillEmailForm(user);
    await checkTerms(user);
    await user.click(screen.getByRole('button', { name: /Create account/i }));
    expect(await screen.findByText(/centre or organisation name/i)).toBeInTheDocument();
    expect(mockedRegister).not.toHaveBeenCalled();
  });

  it('blocks submit and shows error when phone is missing', async () => {
    const user = setup();
    await user.type(screen.getByLabelText(/Your name/i), 'Jane');
    await user.type(screen.getByLabelText(/Centre \/ organisation name/i), 'Bright Stars');
    await fillEmailForm(user);
    await checkTerms(user);
    await user.click(screen.getByRole('button', { name: /Create account/i }));
    expect(await screen.findByText(/Please enter a contact number/i)).toBeInTheDocument();
    expect(mockedRegister).not.toHaveBeenCalled();
  });

  it('Create account button stays disabled until terms are accepted, even with a complete form', async () => {
    const user = setup();
    await fillProfile(user);
    await fillEmailForm(user);
    // Terms deliberately NOT checked.
    expect(screen.getByRole('button', { name: /Create account/i })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /Create account/i }));
    expect(mockedRegister).not.toHaveBeenCalled();
  });

  it('successful email submit calls register with email + password + displayName + acceptedTerms:true — no birthYear or parentEmail', async () => {
    const user = setup();
    await fillProfile(user, { name: 'Jane Smith', org: 'Bright Stars', phone: '+65 9000 0000' });
    await fillEmailForm(user, { email: 'jane@bright.edu', password: 'securepassword' });
    await checkTerms(user);
    expect(screen.getByRole('button', { name: /Create account/i })).toBeEnabled();
    await user.click(screen.getByRole('button', { name: /Create account/i }));

    await waitFor(() => expect(mockedRegister).toHaveBeenCalledTimes(1));
    const arg = mockedRegister.mock.calls[0][0];
    expect(arg.email).toBe('jane@bright.edu');
    expect(arg.password).toBe('securepassword');
    expect(arg.displayName).toBe('Jane Smith');
    expect(arg.acceptedTerms).toBe(true);
    expect(arg).not.toHaveProperty('birthYear');
    expect(arg).not.toHaveProperty('parentEmail');
  });

  it('after register succeeds, calls onboardCentre with the org name', async () => {
    const user = setup();
    await fillProfile(user, { org: 'Bright Stars Tuition' });
    await fillEmailForm(user);
    await checkTerms(user);
    await user.click(screen.getByRole('button', { name: /Create account/i }));

    await waitFor(() => expect(mockedOnboard).toHaveBeenCalledTimes(1));
    expect(mockedOnboard).toHaveBeenCalledWith('Bright Stars Tuition');
  });

  it('redirects to /dashboard after successful registration + onboarding', async () => {
    const user = setup();
    await fillProfile(user);
    await fillEmailForm(user);
    await checkTerms(user);
    await user.click(screen.getByRole('button', { name: /Create account/i }));

    await waitFor(() => expect(replace).toHaveBeenCalledWith('/dashboard'));
  });

  it('shows inline error on duplicate email (409)', async () => {
    const { ApiError } = await import('@/lib/api');
    mockedRegister.mockRejectedValue(new ApiError(409, 'EMAIL_CONFLICT', 'already exists', false));
    const user = setup();
    await fillProfile(user);
    await fillEmailForm(user);
    await checkTerms(user);
    await user.click(screen.getByRole('button', { name: /Create account/i }));

    expect(await screen.findByText(/already exists/i)).toBeInTheDocument();
    expect(replace).not.toHaveBeenCalled();
  });
});
