/**
 * Marking Assistant panel — the teacher SEES the compiled marking standard
 * (marking-wiki pages + brain state + conflicts), so uploads visibly turn into
 * a structured, improving standard rather than vanishing into a blob.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual, // keep real asArray
    api: {
      markingReferences: vi.fn().mockResolvedValue({ data: [] }),
      markingBrain: vi.fn(),
      uploadMarkingReference: vi.fn(),
      deleteMarkingReference: vi.fn(),
    },
  };
});

import { api, type MarkingBrain } from '@/lib/api';
import { MarkingAssistantPanel } from '@/app/dashboard/classes/[classId]/tabs/MarkingAssistantPanel';

function renderWithClient(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

const brain = (over: Partial<MarkingBrain> = {}): { data: MarkingBrain } => ({
  data: {
    state: 'READY',
    subject: 'Maths',
    pageCount: 2,
    hasConflicts: false,
    pages: [
      { title: 'How Method Marks Are Awarded', slug: 'awarding-method-marks',
        preview: 'Award the method mark even if the answer is wrong.', certainty: 'INFERRED', hasConflict: false },
      { title: 'Common Deductions', slug: 'common-deductions',
        preview: 'Deduct a mark for missing units.', certainty: 'INFERRED', hasConflict: false },
    ],
    ...over,
  },
});

beforeEach(() => vi.clearAllMocks());

describe('MarkingAssistantPanel — learned standard', () => {
  it('shows the compiled marking pages and Ready state', async () => {
    vi.mocked(api.markingBrain).mockResolvedValue(brain());

    renderWithClient(<MarkingAssistantPanel orgId="org-1" classId="cls-1" />);

    expect(await screen.findByText('🧠 What your assistant has learned')).toBeInTheDocument();
    expect(screen.getByText('How Method Marks Are Awarded')).toBeInTheDocument();
    expect(screen.getByText('Common Deductions')).toBeInTheDocument();
    expect(screen.getByText('Ready')).toBeInTheDocument();
  });

  it('makes the shared (org, subject) scope explicit in the copy', async () => {
    vi.mocked(api.markingBrain).mockResolvedValue(brain());

    const { container } = renderWithClient(
      <MarkingAssistantPanel orgId="org-1" classId="cls-1" subject="Maths" />);

    // Wait for the compiled brain (async) so the caption is rendered too.
    await screen.findByText('🧠 What your assistant has learned');
    // Scope banner tells the teacher the standard is shared across all their
    // Maths classes — not just this one class.
    expect(container.textContent).toContain('shared across all your Maths classes');
    // The compiled-standard caption reinforces the shared scope.
    expect(container.textContent).toContain('Shared Maths marking standard');
  });

  it('surfaces a conflict banner when marking materials contradict each other', async () => {
    vi.mocked(api.markingBrain).mockResolvedValue(brain({
      hasConflicts: true,
      pages: [{ title: 'How Method Marks Are Awarded', slug: 'awarding-method-marks',
        preview: 'Award...', certainty: 'UNCERTAIN', hasConflict: true }],
      pageCount: 1,
    }));

    renderWithClient(<MarkingAssistantPanel orgId="org-1" classId="cls-1" />);

    expect(await screen.findByText(/contradict each other/i)).toBeInTheDocument();
    expect(screen.getByText('conflict')).toBeInTheDocument();
  });

  it('hides the learned-standard section before anything is compiled', async () => {
    vi.mocked(api.markingBrain).mockResolvedValue(
      { data: { state: 'NOT_BUILT', pageCount: 0, pages: [], hasConflicts: false } });

    renderWithClient(<MarkingAssistantPanel orgId="org-1" classId="cls-1" />);

    // The references empty-state renders; the brain section does not.
    await waitFor(() => expect(api.markingBrain).toHaveBeenCalled());
    expect(screen.queryByText('🧠 What your assistant has learned')).not.toBeInTheDocument();
  });
});
