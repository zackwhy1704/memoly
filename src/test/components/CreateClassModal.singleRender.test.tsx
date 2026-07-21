import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CreateClassModal from '@/app/dashboard/classes/modals/CreateClassModal';
import { api } from '@/lib/api';

// SINGLE-RENDER INVARIANT (FIX 1): the derived upload/compile status must render in
// EXACTLY ONE place. This test uses the REAL MochiUploader (NOT mocked) so all the
// former render sites are live — the compile chip, the UploadResult card, and the
// wizard's own banner. Before the fix a failed compile printed the failure copy in
// all THREE (the "three red boxes"). deriveUploadStatus stays REAL; only the
// network-touching pipeline fns are stubbed to force a failed compile.
vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }));

vi.mock('@/lib/upload-pipeline', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/upload-pipeline')>();
  return {
    ...actual,
    runUploadPipeline: vi.fn().mockResolvedValue({
      files: [{ name: 'notes.pdf', stage: 'done' }],
      brainReady: false,
      wikiPageCount: 0,
    }),
    recompileAndPollBrain: vi.fn().mockImplementation(async (_id: string, onTick?: (s: string) => void) => {
      onTick?.('failed');
      return {
        brainReady: false,
        wikiPageCount: 0,
        failedPages: [],
        compileFailureReason:
          'We couldn’t read enough text from this file — try a clearer scan or a text-based PDF.',
      };
    }),
    uploadSingleFile: vi.fn(),
  };
});

vi.mock('@/components/AvatarPickerModal', () => ({
  default: () => <div data-testid="avatar-picker-modal" />,
}));
vi.mock('@/components/MochiAvatar', () => ({
  default: () => <div data-testid="mochi-avatar" />,
}));
vi.mock('@/app/dashboard/classes/[classId]/components/ContentReviewPanel', () => ({
  ContentReviewPanel: () => <div data-testid="content-review-panel" />,
}));

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      createClass: vi.fn(),
      setMochiConfig: vi.fn(),
      avatar: vi.fn(),
    },
  };
});

const MOCK_CLASS = {
  id: 'class-1',
  name: 'P4 Science',
  subject: 'SCIENCE',
  level: null,
  joinCode: 'XYZ789',
  corpusAvatarId: 'avatar-1',
  characterType: 'MOCHI',
  brandName: null,
  accentColor: null,
  examDate: null,
  cosmeticEyewear: null,
  cosmeticClothes: null,
  cosmeticShoes: null,
  studentCount: 0,
};

function renderModal() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <CreateClassModal orgId="org-1" onClose={vi.fn()} onCreated={vi.fn()} />
    </QueryClientProvider>
  );
}

async function goToStep3AndFailCompile() {
  vi.mocked(api.createClass).mockResolvedValue({ data: MOCK_CLASS } as Awaited<ReturnType<typeof api.createClass>>);
  vi.mocked(api.setMochiConfig).mockResolvedValue({} as Awaited<ReturnType<typeof api.setMochiConfig>>);
  vi.mocked(api.avatar).mockResolvedValue({ data: MOCK_CLASS } as unknown as Awaited<ReturnType<typeof api.avatar>>);

  renderModal();
  fireEvent.change(screen.getByPlaceholderText('P4 Math'), { target: { value: 'P4 Science' } });
  fireEvent.click(screen.getByRole('button', { name: 'Next →' }));
  fireEvent.click(screen.getByRole('button', { name: /Create class & continue/i }));
  await waitFor(() => expect(screen.getByText('P4 Science is ready!')).toBeInTheDocument());

  // Drive the REAL uploader: pick a file → runUploadPipeline (done) → failed compile.
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  const file = new File([new Uint8Array(1024)], 'notes.pdf', { type: 'application/pdf' });
  fireEvent.change(input, { target: { files: [file] } });
}

describe('CreateClassModal — single-render status invariant (FIX 1)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders the compile-failure copy EXACTLY ONCE across the whole modal', async () => {
    await goToStep3AndFailCompile();
    // Fail-without-fix: three sites (chip + UploadResult + wizard banner) = 3 matches.
    await waitFor(() => expect(screen.getAllByText(/Compiling failed/).length).toBe(1));
  });

  it('shows a Recompile affordance in the failed state (not just "Upload more")', async () => {
    await goToStep3AndFailCompile();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Recompile' })).toBeInTheDocument());
  });
});
