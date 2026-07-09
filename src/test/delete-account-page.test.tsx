import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock the router search params + the fetch layer; keep ApiError real (the page
// branches on `instanceof ApiError` and `err.code`).
vi.mock('next/navigation', () => ({ useSearchParams: vi.fn() }));
vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return { ...actual, apiFetch: vi.fn() };
});

import { useSearchParams } from 'next/navigation';
import { apiFetch, ApiError } from '@/lib/api';
import DeleteAccountPage from '@/app/delete-account/page';

const mockedSearch = vi.mocked(useSearchParams);
const mockedFetch = vi.mocked(apiFetch);

function setToken(token: string | null) {
  mockedSearch.mockReturnValue(
    new URLSearchParams(token ? { token } : {}) as unknown as ReturnType<
      typeof useSearchParams
    >
  );
}

describe('DeleteAccountPage (public)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('email entry → submit shows the SAME non-enumerating "check your email" state',
    async () => {
      setToken(null);
      mockedFetch.mockResolvedValue({} as never);
      render(<DeleteAccountPage />);

      await userEvent.type(screen.getByLabelText('Email address'), 'a@b.com');
      await userEvent.click(
        screen.getByRole('button', { name: /email me a deletion link/i })
      );

      // Identical outcome regardless of whether the account exists.
      expect(await screen.findByText(/check your email/i)).toBeInTheDocument();
      expect(
        screen.getByText(/if an account exists for that email/i)
      ).toBeInTheDocument();
    });

  it('confirm with a token → 409 CENTRE_NOT_EMPTY renders the centre state',
    async () => {
      setToken('tok1');
      mockedFetch.mockRejectedValue(
        new ApiError(
          409,
          'CENTRE_NOT_EMPTY',
          'Please transfer or close your centre before deleting your account.',
          false
        )
      );
      render(<DeleteAccountPage />);

      await userEvent.click(
        screen.getByRole('button', { name: /delete my account/i })
      );

      expect(
        await screen.findByText(/close your centre first/i)
      ).toBeInTheDocument();
    });

  it('confirm with an expired/invalid token → 400 renders the expired state',
    async () => {
      setToken('tok1');
      mockedFetch.mockRejectedValue(
        new ApiError(400, null, 'This deletion link is invalid or has expired.', false)
      );
      render(<DeleteAccountPage />);

      await userEvent.click(
        screen.getByRole('button', { name: /delete my account/i })
      );

      expect(await screen.findByText(/link expired/i)).toBeInTheDocument();
    });

  it('confirm success → scheduled state', async () => {
    setToken('tok1');
    mockedFetch.mockResolvedValue({
      data: { graceEndsAt: '2026-07-23T00:00:00Z' },
    } as never);
    render(<DeleteAccountPage />);

    await userEvent.click(
      screen.getByRole('button', { name: /delete my account/i })
    );

    expect(
      await screen.findByText(/scheduled for deletion/i)
    ).toBeInTheDocument();
  });
});
