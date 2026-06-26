import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConsentPendingPanel from '@/components/ConsentPendingPanel';
import { api, ApiError, type ConsentPendingInfo } from '@/lib/api';

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    api: { ...actual.api, resendParentConsent: vi.fn() },
  };
});

const resendMock = api.resendParentConsent as unknown as ReturnType<typeof vi.fn>;

const baseInfo: ConsentPendingInfo = {
  parentEmailMasked: 'j***@gmail.com',
  resendAvailable: true,
  resendAvailableInSeconds: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ConsentPendingPanel', () => {
  it('renders the masked parent email and a Resend button', () => {
    render(<ConsentPendingPanel info={baseInfo} />);
    expect(screen.getByText('Waiting for your parent')).toBeInTheDocument();
    expect(screen.getByText('j***@gmail.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /resend email/i })).toBeInTheDocument();
  });

  it('calls api.resendParentConsent on click and shows the success state', async () => {
    const user = userEvent.setup();
    resendMock.mockResolvedValue({ parentEmailMasked: 'j***@gmail.com', resendAvailableInSeconds: 60 });

    render(<ConsentPendingPanel info={baseInfo} />);
    await user.click(screen.getByRole('button', { name: /resend email/i }));

    expect(resendMock).toHaveBeenCalledTimes(1);
    await screen.findByText(/re-sent to j\*\*\*@gmail\.com/i);
    expect(screen.getByText(/check inbox\/spam/i)).toBeInTheDocument();
  });

  it('starts in cooldown (disabled + countdown) when resend is not yet available', () => {
    render(
      <ConsentPendingPanel
        info={{ ...baseInfo, resendAvailable: false, resendAvailableInSeconds: 120 }}
      />
    );
    const btn = screen.getByRole('button', { name: /resend email/i });
    expect(btn).toBeDisabled();
    expect(screen.getByText(/you can resend in 2 min/i)).toBeInTheDocument();
  });

  it('a 429 from resend moves the button to a disabled cooldown state', async () => {
    const user = userEvent.setup();
    resendMock.mockRejectedValue(
      new ApiError(429, null, 'Please wait 30s before resending...', true)
    );

    render(<ConsentPendingPanel info={baseInfo} />);
    await user.click(screen.getByRole('button', { name: /resend email/i }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /resend email/i })).toBeDisabled()
    );
    expect(screen.getByText(/you can resend in 30 sec/i)).toBeInTheDocument();
  });

  it('shows the failure state when resend errors', async () => {
    const user = userEvent.setup();
    resendMock.mockRejectedValue(new ApiError(500, null, 'boom', true));

    render(<ConsentPendingPanel info={baseInfo} />);
    await user.click(screen.getByRole('button', { name: /resend email/i }));

    await screen.findByText(/couldn't resend — try again shortly/i);
  });
});
