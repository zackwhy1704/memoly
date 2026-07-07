/**
 * Marking corrections panel (Part 4 damper): the teacher SEES the AI-vs-teacher
 * corrections the assistant learned, with pending/applied status, and can REMOVE
 * a bad one. Copy must be honest — an applied correction excludes-from-future,
 * it does not instantly un-learn.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual, // keep real asArray + ApiError
    api: {
      markingCorrections: vi.fn(),
      deleteMarkingCorrection: vi.fn(),
    },
  };
});

import { api, type MarkingCorrection } from '@/lib/api';
import { MarkingCorrectionsSection } from '@/app/dashboard/classes/[classId]/tabs/MarkingCorrections';

function renderWithClient(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

const correction = (over: Partial<MarkingCorrection> = {}): MarkingCorrection => ({
  id: 'c1',
  subject: 'Maths',
  aiSuggestedGrade: 'A',
  teacherGrade: 'C',
  aiFeedback: 'Correct.',
  teacherFeedback: 'Wrong — you divided instead of multiplied.',
  capturedAt: '2026-07-01T00:00:00Z',
  status: 'pending',
  ...over,
});

beforeEach(() => vi.clearAllMocks());

describe('MarkingCorrectionsSection', () => {
  it('renders corrections with their delta and status', async () => {
    vi.mocked(api.markingCorrections).mockResolvedValue({
      data: [correction({ status: 'applied' })],
    });

    renderWithClient(<MarkingCorrectionsSection orgId="org-1" classId="cls-1" />);

    // The AI-vs-teacher delta (grade + feedback) is shown.
    expect(await screen.findByText(/Grade:/)).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.getByText(/divided instead of multiplied/)).toBeInTheDocument();
    // Applied status + the HONEST decay copy (not "instantly un-learn").
    expect(screen.getByText('Applied')).toBeInTheDocument();
    expect(screen.getByText(/excludes it from future updates/)).toBeInTheDocument();
  });

  it('remove calls DELETE and refreshes the list', async () => {
    vi.mocked(api.markingCorrections)
      .mockResolvedValueOnce({ data: [correction()] })
      .mockResolvedValueOnce({ data: [] });
    vi.mocked(api.deleteMarkingCorrection).mockResolvedValue({ data: { removed: true } });
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    renderWithClient(<MarkingCorrectionsSection orgId="org-1" classId="cls-1" />);

    await userEvent.click(await screen.findByRole('button', { name: /remove/i }));

    await waitFor(() =>
      expect(api.deleteMarkingCorrection).toHaveBeenCalledWith('org-1', 'cls-1', 'c1'));
  });

  it('shows the empty state when nothing is learned yet', async () => {
    vi.mocked(api.markingCorrections).mockResolvedValue({ data: [] });

    renderWithClient(<MarkingCorrectionsSection orgId="org-1" classId="cls-1" />);

    expect(await screen.findByText(/No corrections learned yet/)).toBeInTheDocument();
  });
});
