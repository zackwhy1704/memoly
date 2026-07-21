import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the pipeline so we control the recompile outcome (partial vs clean) and
// never touch the network. Spread the ACTUAL module so the pure helpers the
// component now depends on — deriveUploadStatus (the single status owner),
// ACCEPT_ATTR, MAX_FILES — stay real; only the network-touching functions are
// stubbed. (Stubbing deriveUploadStatus away would crash the component at render.)
vi.mock('@/lib/upload-pipeline', async (importActual) => {
  const actual = await importActual<typeof import('@/lib/upload-pipeline')>();
  return {
    ...actual,
    runUploadPipeline: vi.fn().mockResolvedValue({
      files: [{ name: 'notes.pdf', stage: 'done' }],
      brainReady: false,
      wikiPageCount: 0,
    }),
    recompileAndPollBrain: vi.fn(),
    uploadSingleFile: vi.fn(),
  };
});
vi.mock('@/lib/analytics', () => ({ trackEvent: vi.fn() }));
// MochiUploader now fetches the avatar's subject (['avatar', avatarId]) for the
// RelevanceWarningDialog's fallback copy — spread the real module so unrelated
// exports (types, other api functions) stay intact; only `avatar` is stubbed so
// no test here touches the network.
vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    api: { ...actual.api, avatar: vi.fn().mockResolvedValue({ data: { subject: 'MATHS' } }) },
  };
});

import MochiUploader from '@/components/MochiUploader';
import { recompileAndPollBrain, runUploadPipeline, uploadSingleFile, type FileProgress } from '@/lib/upload-pipeline';

function selectAFile() {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  const file = new File([new Uint8Array(1024)], 'notes.pdf', { type: 'application/pdf' });
  fireEvent.change(input, { target: { files: [file] } });
}

function renderUploader(props: Parameters<typeof MochiUploader>[0]) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MochiUploader {...props} />
    </QueryClientProvider>
  );
}

describe('MochiUploader — partial-compile surfacing', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows an "X of Y" warning chip + the failed topics when the compile is partial', async () => {
    vi.mocked(recompileAndPollBrain).mockImplementation(async (_id, onTick) => {
      onTick?.('ready');
      return {
        brainReady: true,
        wikiPageCount: 6,
        failedPages: [{ slug: 'osmosis', reason: 'conflict_note' }],
      };
    });

    renderUploader({ avatarId: 'av1', classId: 'cls-1' });
    selectAFile();

    // Honest count — "6 of 7 pages compiled". Single owner now (UploadResult); the
    // duplicate compile chip was removed, so getAllByText yields exactly 1.
    await waitFor(() =>
      expect(screen.getAllByText(/6 of 7 pages compiled/).length).toBeGreaterThan(0)
    );
    expect(screen.getByText(/Brain incomplete/)).toBeInTheDocument();
    expect(screen.getByText(/osmosis/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Recompile' })).toBeInTheDocument();
    // The green full-success copy must NOT appear.
    expect(screen.queryByText(/Notes compiled — 6 pages ready/)).not.toBeInTheDocument();
  });

  it('shows the plain success card when the compile is clean (no failures)', async () => {
    vi.mocked(recompileAndPollBrain).mockImplementation(async (_id, onTick) => {
      onTick?.('ready');
      return { brainReady: true, wikiPageCount: 6, failedPages: [] };
    });

    renderUploader({ avatarId: 'av1', classId: 'cls-1' });
    selectAFile();

    // Single owner is the UploadResult card; its clean-success copy (not the removed
    // chip) confirms success — and the partial warning must be absent.
    await waitFor(() =>
      expect(screen.getByText(/Compiled into the class wiki/)).toBeInTheDocument()
    );
    expect(screen.getByText(/6 pages total/)).toBeInTheDocument();
    expect(screen.queryByText(/Brain incomplete/)).not.toBeInTheDocument();
  });
});

describe('MochiUploader — compile-failure affordances (FIX 1 + FIX 2)', () => {
  beforeEach(() => vi.clearAllMocks());

  // The backend reason is a full sentence ending in a period (AvatarMapper).
  function mockFailedCompile() {
    vi.mocked(recompileAndPollBrain).mockImplementation(async (_id, onTick) => {
      onTick?.('failed');
      return {
        brainReady: false,
        wikiPageCount: 0,
        failedPages: [],
        compileFailureReason:
          'We couldn’t read enough text from this file — try a clearer scan or a text-based PDF.',
      };
    });
  }

  it('renders the failure copy EXACTLY ONCE (single owner — no duplicate chip)', async () => {
    mockFailedCompile();
    renderUploader({ avatarId: 'av1', classId: 'cls-1' });
    selectAFile();

    await waitFor(() =>
      expect(screen.getAllByText(/Compiling failed/).length).toBe(1)
    );
  });

  it('offers a Recompile button in the FAILED state (not only "Upload more")', async () => {
    mockFailedCompile();
    renderUploader({ avatarId: 'av1', classId: 'cls-1' });
    selectAFile();

    await waitFor(() => expect(screen.getByRole('button', { name: 'Recompile' })).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Upload more/i })).toBeInTheDocument();
  });

  it('does NOT double the period when the backend reason already ends in one', async () => {
    mockFailedCompile();
    renderUploader({ avatarId: 'av1', classId: 'cls-1' });
    selectAFile();

    await waitFor(() => expect(screen.getByText(/Compiling failed/)).toBeInTheDocument());
    const text = screen.getByText(/Compiling failed/).textContent ?? '';
    expect(text).not.toMatch(/\.\./); // no ".." artifact from suffix-on-a-sentence
    expect(text).toMatch(/text-based PDF\. Your files are saved — try recompiling\./);
  });
});

// ── SERVER relevance rejection dialog ────────────────────────────────
// Before this fix, web had NO handler for the server's RelevanceWarning result
// at all — the file silently reported as 'done'. Applies uniformly to every
// caller of this uploader (personal Mochi + centre class), never gated by
// centre-vs-solo.
describe('MochiUploader — RelevanceWarning dialog', () => {
  beforeEach(() => vi.clearAllMocks());

  function pipelineYieldsRelevanceWarning(reason = "This file doesn't seem to match Maths.") {
    vi.mocked(runUploadPipeline).mockImplementation(async (_avatarId, files, onUpdate) => {
      const file = files[0];
      const fp: FileProgress = { name: file.name, stage: 'relevanceWarning', reason, file };
      onUpdate([fp]);
      return { files: [fp], brainReady: false, wikiPageCount: 0 };
    });
  }

  it('a relevanceWarning file → dialog opens showing the reason text', async () => {
    pipelineYieldsRelevanceWarning('This file looks like a grocery list, not Maths notes.');
    renderUploader({ avatarId: 'av1', classId: 'cls-1' });
    selectAFile();

    await waitFor(() => expect(screen.getByText('Hmm, this might not fit!')).toBeInTheDocument());
    expect(screen.getByText(/grocery list, not Maths notes/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go Back' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Anyway' })).toBeInTheDocument();
  });

  it('"Add Anyway" retries the SAME file with skipRelevance:true (forceSkipRelevance)', async () => {
    pipelineYieldsRelevanceWarning();
    // Mirrors the real uploadSingleFile contract: invoke onProgress with the final
    // result (as the real implementation does) so the component's progress state
    // actually transitions out of 'relevanceWarning' and the dialog can close.
    vi.mocked(uploadSingleFile).mockImplementation(async (_avatarId, file, onProgress) => {
      const result: FileProgress = { name: file.name, stage: 'done', file };
      onProgress(result);
      return result;
    });

    renderUploader({ avatarId: 'av1', classId: 'cls-1' });
    selectAFile();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Add Anyway' })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Add Anyway' }));

    await waitFor(() =>
      expect(uploadSingleFile).toHaveBeenCalledWith(
        'av1',
        expect.any(File),
        expect.any(Function),
        { forceSkipRelevance: true }
      )
    );
    // Dialog closes once the retried file leaves the relevanceWarning stage.
    await waitFor(() => expect(screen.queryByText('Hmm, this might not fit!')).not.toBeInTheDocument());
  });

  it('"Go Back" removes the file from the pending list and fires NO retry call', async () => {
    pipelineYieldsRelevanceWarning();
    renderUploader({ avatarId: 'av1', classId: 'cls-1' });
    selectAFile();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Go Back' })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Go Back' }));

    await waitFor(() => expect(screen.queryByText('Hmm, this might not fit!')).not.toBeInTheDocument());
    expect(screen.queryByText('notes.pdf')).not.toBeInTheDocument();
    expect(uploadSingleFile).not.toHaveBeenCalled();
  });
});
