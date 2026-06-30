/**
 * Homework Submissions — the teacher-in-the-loop invariants made visible:
 * the AI only DRAFTS, and nothing releases to a student without non-blank
 * teacher feedback (the Release button is gated on it). Plus the AI-draft
 * JSON parse is tolerant of malformed model output.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual, // keep real parseAiDraft + asArray
    api: {
      submissions: vi.fn(),
      submission: vi.fn(),
      submissionFileUrl: vi.fn().mockResolvedValue('blob:fake'),
      generateSubmissionDraft: vi.fn(),
      saveSubmissionReview: vi.fn(),
      releaseSubmission: vi.fn(),
      returnSubmission: vi.fn(),
      classRoster: vi.fn().mockResolvedValue({ data: [] }),
    },
  };
});

import { api, parseAiDraft, type Submission } from '@/lib/api';
import { SubmissionsTab } from '@/app/dashboard/classes/[classId]/tabs/SubmissionsTab';

function renderWithClient(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

const sub = (over: Partial<Submission> = {}): Submission => ({
  id: 's-1', classId: 'cls-1', studentId: 'stud-1', title: 'Maths WS3',
  subject: 'Maths', status: 'SUBMITTED',
  files: [{ index: 0, name: 'work.jpg', contentType: 'image/jpeg', size: 1234 }],
  extractedText: '2 + 2 = 5', aiDraftFeedbackJson: null, aiDraftedAt: null,
  teacherFeedback: null, teacherGrade: null, releasedAt: null,
  createdAt: '2026-06-10T00:00:00Z', updatedAt: '2026-06-10T00:00:00Z', ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  // jsdom lacks object-URL lifecycle; FilePreview cleanup calls revoke.
  globalThis.URL.revokeObjectURL = vi.fn();
});

describe('parseAiDraft', () => {
  it('parses a well-formed draft', () => {
    expect(parseAiDraft('{"suggestedGrade":"B+","feedback":"Nice"}'))
      .toEqual({ suggestedGrade: 'B+', feedback: 'Nice' });
  });
  it('returns null for malformed JSON instead of throwing', () => {
    expect(parseAiDraft('not json {')).toBeNull();
    expect(parseAiDraft(null)).toBeNull();
    expect(parseAiDraft('')).toBeNull();
  });
});

describe('SubmissionsTab — inbox', () => {
  it('lists submissions and surfaces the "need marking" count', async () => {
    vi.mocked(api.submissions).mockResolvedValue({ data: [sub(), sub({ id: 's-2', title: 'Sci Lab', status: 'RELEASED' })] });
    renderWithClient(<SubmissionsTab orgId="org-1" classId="cls-1" />);

    expect(await screen.findByText('Maths WS3')).toBeInTheDocument();
    expect(screen.getByText(/1 need marking/)).toBeInTheDocument();
  });

  it('shows a graceful empty state with no submissions', async () => {
    vi.mocked(api.submissions).mockResolvedValue({ data: [] });
    renderWithClient(<SubmissionsTab orgId="org-1" classId="cls-1" />);
    expect(await screen.findByText('No submissions yet')).toBeInTheDocument();
  });
});

describe('SubmissionsTab — teacher-in-the-loop release gate', () => {
  it('disables Release until the teacher writes feedback, then releases with it', async () => {
    vi.mocked(api.submissions).mockResolvedValue({ data: [sub()] });
    vi.mocked(api.submission).mockResolvedValue({ data: sub() });
    vi.mocked(api.releaseSubmission).mockResolvedValue({ data: sub({ status: 'RELEASED', teacherFeedback: 'Well done' }) });
    renderWithClient(<SubmissionsTab orgId="org-1" classId="cls-1" />);

    fireEvent.click(await screen.findByText('Maths WS3'));

    const release = await screen.findByText('Release to student');
    expect(release).toBeDisabled();

    fireEvent.change(screen.getByPlaceholderText(/Write the feedback/), { target: { value: 'Well done' } });
    expect(release).toBeEnabled();

    fireEvent.click(release);
    await waitFor(() =>
      expect(api.releaseSubmission).toHaveBeenCalledWith('org-1', 'cls-1', 's-1', { feedback: 'Well done', grade: '' })
    );
  });

  it('generates an AI draft on demand and shows it as a draft (never auto-released)', async () => {
    vi.mocked(api.submissions).mockResolvedValue({ data: [sub()] });
    vi.mocked(api.submission).mockResolvedValue({ data: sub() });
    vi.mocked(api.generateSubmissionDraft).mockResolvedValue({
      data: sub({
        status: 'AI_DRAFTED',
        aiDraftFeedbackJson: '{"suggestedGrade":"B","criteria":[{"criterion":"Method","comment":"Show working"}],"feedback":"Good attempt"}',
      }),
    });
    renderWithClient(<SubmissionsTab orgId="org-1" classId="cls-1" />);

    fireEvent.click(await screen.findByText('Maths WS3'));
    fireEvent.click(await screen.findByText('✨ Generate AI draft'));

    await waitFor(() => expect(api.generateSubmissionDraft).toHaveBeenCalledWith('org-1', 'cls-1', 's-1'));
    expect(await screen.findByText('AI first-pass (draft)')).toBeInTheDocument();
    expect(screen.getByText(/Show working/)).toBeInTheDocument();
  });

  it('a released submission is read-only — no Release/Return controls', async () => {
    const released = sub({ status: 'RELEASED', teacherFeedback: 'Great work', teacherGrade: 'A', releasedAt: '2026-06-11T00:00:00Z' });
    vi.mocked(api.submissions).mockResolvedValue({ data: [released] });
    vi.mocked(api.submission).mockResolvedValue({ data: released });
    renderWithClient(<SubmissionsTab orgId="org-1" classId="cls-1" />);

    fireEvent.click(await screen.findByText('Maths WS3'));
    expect(await screen.findByText(/Released to the student/)).toBeInTheDocument();
    expect(screen.queryByText('Release to student')).not.toBeInTheDocument();
    expect(screen.queryByText('Return for redo')).not.toBeInTheDocument();
  });
});
