import { Suspense } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock the fetch layer (the review API helpers). The page consumes these.
vi.mock('@/lib/review-api', () => ({
  loadReview: vi.fn(),
  respondReview: vi.fn(),
}));

import { loadReview, respondReview } from '@/lib/review-api';
import ReviewPage from '@/app/review/[token]/page';

const mockedLoad = vi.mocked(loadReview);
const mockedRespond = vi.mocked(respondReview);

async function renderPage(token = 'tok123') {
  // ReviewPage unwraps `params` via React.use(), which suspends until the
  // promise resolves — provide a Suspense boundary (Next.js does this at runtime)
  // and flush microtasks inside act() so the suspended render commits.
  await act(async () => {
    render(
      <Suspense fallback={null}>
        <ReviewPage params={Promise.resolve({ token })} />
      </Suspense>
    );
    await Promise.resolve();
  });
}

const SAMPLE_CONTENT = {
  pageTitle: 'Photosynthesis Basics',
  subject: 'BIOLOGY',
  contentMarkdown:
    '# Overview\n\nPlants make food from **sunlight**.\n\n- Needs water\n- Needs CO2',
  status: 'PENDING',
  createdAt: '2026-06-01T00:00:00Z',
};

describe('ReviewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('(a) renders the review content and both action buttons', async () => {
    mockedLoad.mockResolvedValue({ kind: 'ok', content: SAMPLE_CONTENT });
    await renderPage();

    expect(await screen.findByText('Photosynthesis Basics')).toBeInTheDocument();
    expect(screen.getByText('BIOLOGY')).toBeInTheDocument();
    // Rendered markdown — heading + bold text + list item.
    expect(screen.getByText('Overview')).toBeInTheDocument();
    expect(screen.getByText('sunlight')).toBeInTheDocument();
    expect(screen.getByText('Needs water')).toBeInTheDocument();
    // Action buttons.
    expect(screen.getByRole('button', { name: /Looks good/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Something's off/i })
    ).toBeInTheDocument();
  });

  it('(b) flag flow requires a note before it will submit', async () => {
    const user = userEvent.setup();
    mockedLoad.mockResolvedValue({ kind: 'ok', content: SAMPLE_CONTENT });
    await renderPage();

    await screen.findByText('Photosynthesis Basics');
    await user.click(screen.getByRole('button', { name: /Something's off/i }));

    // Note textarea is revealed.
    const note = screen.getByLabelText(/What should they double-check/i);
    expect(note).toBeInTheDocument();

    // Submit button disabled while note empty.
    const submit = screen.getByRole('button', { name: /Send feedback/i });
    expect(submit).toBeDisabled();
    expect(mockedRespond).not.toHaveBeenCalled();

    // Typing a note enables submit and a FLAG verdict is sent.
    mockedRespond.mockResolvedValue({ kind: 'ok', status: 'FLAGGED' });
    await user.type(note, 'The second date is wrong.');
    expect(submit).toBeEnabled();
    await user.click(submit);

    await waitFor(() => expect(mockedRespond).toHaveBeenCalledTimes(1));
    expect(mockedRespond).toHaveBeenCalledWith(
      'tok123',
      expect.objectContaining({ verdict: 'FLAG', note: 'The second date is wrong.' })
    );
  });

  it('(c) renders the expired (410) message distinctly', async () => {
    mockedLoad.mockResolvedValue({ kind: 'gone', status: 'EXPIRED' });
    await renderPage();

    expect(await screen.findByText(/This link has expired/i)).toBeInTheDocument();
    expect(screen.getByText(/send a fresh one/i)).toBeInTheDocument();
    // No action buttons in a gone state.
    expect(
      screen.queryByRole('button', { name: /Looks good/i })
    ).not.toBeInTheDocument();
  });

  it('(c2) renders the already-reviewed (410) message distinctly', async () => {
    mockedLoad.mockResolvedValue({ kind: 'gone', status: 'APPROVED' });
    await renderPage();

    expect(
      await screen.findByText(/already been reviewed/i)
    ).toBeInTheDocument();
  });

  it('(c3) renders the not-found (404) message', async () => {
    mockedLoad.mockResolvedValue({ kind: 'notfound' });
    await renderPage();

    expect(await screen.findByText(/Review link not found/i)).toBeInTheDocument();
  });

  it('(d) shows the success state after an approve respond', async () => {
    const user = userEvent.setup();
    mockedLoad.mockResolvedValue({ kind: 'ok', content: SAMPLE_CONTENT });
    mockedRespond.mockResolvedValue({ kind: 'ok', status: 'APPROVED' });
    await renderPage();

    await screen.findByText('Photosynthesis Basics');
    await user.click(screen.getByRole('button', { name: /Looks good/i }));

    // Approve reveals the optional name field + confirm button (no note required).
    const confirm = await screen.findByRole('button', {
      name: /Confirm — looks good/i,
    });
    expect(confirm).toBeEnabled();
    await user.click(confirm);

    expect(
      await screen.findByText(/Thanks — we've let them know/i)
    ).toBeInTheDocument();
    expect(mockedRespond).toHaveBeenCalledWith(
      'tok123',
      expect.objectContaining({ verdict: 'APPROVE' })
    );
    // Footer learn-more line present.
    expect(screen.getByText(/Learn more/i)).toBeInTheDocument();
  });
});
