/**
 * Web↔mobile content parity: deleting an uploaded file and editing a brain
 * (wiki) page from the Content tab. Covers the confirm gate, the api wiring,
 * the post-delete brain-refresh poll, and graceful empty states.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the api client and the (slow) brain poll so tests stay fast + deterministic.
vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    api: {
      files: vi.fn(),
      deleteFile: vi.fn().mockResolvedValue(undefined),
      wikiPages: vi.fn(),
      getWikiPage: vi.fn(),
      applyCorrection: vi.fn().mockResolvedValue({ data: { humanVerified: true } }),
      avatar: vi.fn().mockResolvedValue({ data: { brainState: 'READY', wikiPageCount: 0 } }),
    },
  };
});
vi.mock('@/lib/upload-pipeline', () => ({
  pollBrainReady: vi.fn().mockResolvedValue({ brainReady: true, wikiPageCount: 0 }),
}));

import { api } from '@/lib/api';
import { pollBrainReady } from '@/lib/upload-pipeline';
import { FilesPanel } from '@/app/dashboard/classes/[classId]/components/FilesPanel';
import { BrainPagesSection } from '@/app/dashboard/classes/[classId]/components/BrainPagesSection';

function renderWithClient(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

const file = (over: Partial<import('@/lib/api').KnowledgeFile> = {}) => ({
  id: 'f-1', fileName: 'notes.pdf', uploadType: 'PDF', pageCount: 3,
  status: 'READY' as const, createdAt: '2026-06-01T00:00:00Z', ...over,
});

describe('FilesPanel — delete an uploaded file', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lists files and shows a Delete control per row', async () => {
    vi.mocked(api.files).mockResolvedValue({ data: [file()] });
    renderWithClient(<FilesPanel avatarId="av-1" />);

    expect(await screen.findByText('notes.pdf')).toBeInTheDocument();
    expect(screen.getByLabelText('Delete notes.pdf')).toBeInTheDocument();
  });

  it('requires confirmation before deleting (no api call until confirmed)', async () => {
    vi.mocked(api.files).mockResolvedValue({ data: [file()] });
    renderWithClient(<FilesPanel avatarId="av-1" />);

    fireEvent.click(await screen.findByLabelText('Delete notes.pdf'));
    // Confirmation dialog with the filename appears; nothing deleted yet.
    expect(await screen.findByText('Delete this file?')).toBeInTheDocument();
    expect(api.deleteFile).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('Cancel'));
    await waitFor(() => expect(screen.queryByText('Delete this file?')).not.toBeInTheDocument());
    expect(api.deleteFile).not.toHaveBeenCalled();
  });

  it('on confirm: calls deleteFile then polls the brain to refresh', async () => {
    vi.mocked(api.files).mockResolvedValue({ data: [file()] });
    renderWithClient(<FilesPanel avatarId="av-1" />);

    fireEvent.click(await screen.findByLabelText('Delete notes.pdf'));
    fireEvent.click(await screen.findByText('Delete'));

    await waitFor(() => expect(api.deleteFile).toHaveBeenCalledWith('av-1', 'f-1'));
    await waitFor(() => expect(pollBrainReady).toHaveBeenCalledWith('av-1'));
  });

  it('renders a graceful empty state with no files (no crash)', async () => {
    vi.mocked(api.files).mockResolvedValue({ data: [] });
    renderWithClient(<FilesPanel avatarId="av-1" />);
    expect(await screen.findByText('No content uploaded yet')).toBeInTheDocument();
  });
});

describe('BrainPagesSection — edit a wiki page (human correction)', () => {
  beforeEach(() => vi.clearAllMocks());

  const wikiPage = {
    id: 'w-1', avatarId: 'av-1', slug: 'photosynthesis', title: 'Photosynthesis',
    content: 'AI draft text', certainty: 'INFERRED' as const, hasConflict: false,
    updatedAt: '2026-06-01T00:00:00Z', humanVerified: false, humanCorrection: null,
  };

  it('lists pages and opens an editor seeded with the page content', async () => {
    vi.mocked(api.wikiPages).mockResolvedValue({ data: [wikiPage] });
    vi.mocked(api.getWikiPage).mockResolvedValue({ data: wikiPage });
    renderWithClient(<BrainPagesSection avatarId="av-1" />);

    fireEvent.click(await screen.findByText('View / Edit'));
    const textarea = await screen.findByDisplayValue('AI draft text');
    expect(textarea).toBeInTheDocument();
  });

  it('saves an edit via applyCorrection with the new text', async () => {
    vi.mocked(api.wikiPages).mockResolvedValue({ data: [wikiPage] });
    vi.mocked(api.getWikiPage).mockResolvedValue({ data: wikiPage });
    renderWithClient(<BrainPagesSection avatarId="av-1" />);

    fireEvent.click(await screen.findByText('View / Edit'));
    const textarea = await screen.findByDisplayValue('AI draft text');
    fireEvent.change(textarea, { target: { value: 'Teacher-corrected text' } });
    fireEvent.click(screen.getByText('Save correction'));

    await waitFor(() =>
      expect(api.applyCorrection).toHaveBeenCalledWith('av-1', 'photosynthesis', 'Teacher-corrected text')
    );
  });

  it('shows a "Teacher-edited" badge for human-verified pages', async () => {
    vi.mocked(api.wikiPages).mockResolvedValue({ data: [{ ...wikiPage, humanVerified: true }] });
    renderWithClient(<BrainPagesSection avatarId="av-1" />);
    expect(await screen.findByText('Teacher-edited')).toBeInTheDocument();
  });

  it('renders a graceful empty state with no pages (no crash)', async () => {
    vi.mocked(api.wikiPages).mockResolvedValue({ data: [] });
    renderWithClient(<BrainPagesSection avatarId="av-1" />);
    expect(await screen.findByText(/No brain pages yet/)).toBeInTheDocument();
  });
});
