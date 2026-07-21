import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

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

import MochiUploader from '@/components/MochiUploader';
import { recompileAndPollBrain } from '@/lib/upload-pipeline';

function selectAFile() {
  const input = document.querySelector('input[type="file"]') as HTMLInputElement;
  const file = new File([new Uint8Array(1024)], 'notes.pdf', { type: 'application/pdf' });
  fireEvent.change(input, { target: { files: [file] } });
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

    render(<MochiUploader avatarId="av1" classId="cls-1" />);
    selectAFile();

    // Honest count — "6 of 7 pages compiled" (the chip AND the result panel both
    // say it; getAllByText tolerates both, getByText would throw on the 2 matches).
    await waitFor(() =>
      expect(screen.getAllByText(/6 of 7 pages compiled/).length).toBeGreaterThan(0)
    );
    expect(screen.getByText(/Brain incomplete/)).toBeInTheDocument();
    expect(screen.getByText(/osmosis/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Recompile' })).toBeInTheDocument();
    // The green full-success copy must NOT appear.
    expect(screen.queryByText(/Notes compiled — 6 pages ready/)).not.toBeInTheDocument();
  });

  it('shows the plain success chip when the compile is clean (no failures)', async () => {
    vi.mocked(recompileAndPollBrain).mockImplementation(async (_id, onTick) => {
      onTick?.('ready');
      return { brainReady: true, wikiPageCount: 6, failedPages: [] };
    });

    render(<MochiUploader avatarId="av1" classId="cls-1" />);
    selectAFile();

    await waitFor(() =>
      expect(screen.getByText(/Notes compiled — 6 pages ready/)).toBeInTheDocument()
    );
    expect(screen.queryByText(/Brain incomplete/)).not.toBeInTheDocument();
  });
});
