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
      regenerateContent: vi.fn().mockResolvedValue({ data: { pageSlug: 'photosynthesis', moduleId: 'm-1', regenerated: true } }),
      avatar: vi.fn().mockResolvedValue({ data: { kind: 'CENTRE_CLASS', brainState: 'READY', wikiPageCount: 0 } }),
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

const wikiPage = (over: Partial<import('@/lib/api').WikiPage> = {}): import('@/lib/api').WikiPage => ({
  id: 'w-1', avatarId: 'av-1', slug: 'photosynthesis', title: 'Photosynthesis',
  content: 'AI draft text', certainty: 'INFERRED', hasConflict: false,
  updatedAt: '2026-06-01T00:00:00Z', humanVerified: false, humanCorrection: null,
  reviewState: 'UNVERIFIED', qualityScore: 72, sourceFileNames: ['notes.pdf'], ...over,
});
const personal = { data: { kind: 'PERSONAL', brainState: 'READY', wikiPageCount: 1 } };
const centre = { data: { kind: 'CENTRE_CLASS', brainState: 'READY', wikiPageCount: 1 } };

describe('BrainPagesSection — list, badges, conflict, quality', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the shipped "Teacher-reviewed" marker for human-verified pages', async () => {
    vi.mocked(api.avatar).mockResolvedValue(centre as never);
    vi.mocked(api.wikiPages).mockResolvedValue({ data: [wikiPage({ humanVerified: true })] });
    renderWithClient(<BrainPagesSection avatarId="av-1" orgId="org-1" classId="cls-1" />);
    expect(await screen.findByText('Teacher-reviewed')).toBeInTheDocument();
  });

  it('surfaces a Conflict marker and the quality score', async () => {
    vi.mocked(api.avatar).mockResolvedValue(centre as never);
    vi.mocked(api.wikiPages).mockResolvedValue({ data: [wikiPage({ hasConflict: true, qualityScore: 41 })] });
    renderWithClient(<BrainPagesSection avatarId="av-1" orgId="org-1" classId="cls-1" />);
    expect(await screen.findByText('Conflict')).toBeInTheDocument();
    expect(screen.getByText('Quality 41/100')).toBeInTheDocument();
  });

  it('renders a graceful empty state with no pages (no crash)', async () => {
    vi.mocked(api.avatar).mockResolvedValue(centre as never);
    vi.mocked(api.wikiPages).mockResolvedValue({ data: [] });
    renderWithClient(<BrainPagesSection avatarId="av-1" orgId="org-1" classId="cls-1" />);
    expect(await screen.findByText(/No brain pages yet/)).toBeInTheDocument();
  });
});

describe('BrainPagesSection — correction editor (mutable, PERSONAL avatar)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('opens an editor seeded with the effective content and saves via applyCorrection', async () => {
    vi.mocked(api.avatar).mockResolvedValue(personal as never);
    vi.mocked(api.wikiPages).mockResolvedValue({ data: [wikiPage()] });
    vi.mocked(api.getWikiPage).mockResolvedValue({ data: wikiPage() });
    renderWithClient(<BrainPagesSection avatarId="av-1" />);

    fireEvent.click(await screen.findByText('View / Edit'));
    const textarea = await screen.findByDisplayValue('AI draft text');
    fireEvent.change(textarea, { target: { value: 'Teacher-corrected text' } });
    fireEvent.click(screen.getByText('Save correction'));

    await waitFor(() =>
      expect(api.applyCorrection).toHaveBeenCalledWith('av-1', 'photosynthesis', 'Teacher-corrected text')
    );
    // Propagation notice appears after a successful correction.
    expect(await screen.findByText(/Students still see the previously generated lessons/)).toBeInTheDocument();
  });

  it('seeds the editor from an existing humanCorrection overlay when present', async () => {
    vi.mocked(api.avatar).mockResolvedValue(personal as never);
    const corrected = wikiPage({ humanCorrection: 'My fixed version', humanVerified: true });
    vi.mocked(api.wikiPages).mockResolvedValue({ data: [corrected] });
    vi.mocked(api.getWikiPage).mockResolvedValue({ data: corrected });
    renderWithClient(<BrainPagesSection avatarId="av-1" />);

    fireEvent.click(await screen.findByText('View / Edit'));
    expect(await screen.findByDisplayValue('My fixed version')).toBeInTheDocument();
  });
});

describe('BrainPagesSection — locked centre material + regenerate propagation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders read-only with a reason and NO save for centre class material', async () => {
    vi.mocked(api.avatar).mockResolvedValue(centre as never);
    vi.mocked(api.wikiPages).mockResolvedValue({ data: [wikiPage()] });
    vi.mocked(api.getWikiPage).mockResolvedValue({ data: wikiPage() });
    renderWithClient(<BrainPagesSection avatarId="av-1" orgId="org-1" classId="cls-1" />);

    // List shows "View" (not "View / Edit") and a lock banner.
    expect(await screen.findByText('View')).toBeInTheDocument();
    expect(screen.getByText(/managed centrally/)).toBeInTheDocument();

    fireEvent.click(screen.getByText('View'));
    const textarea = await screen.findByDisplayValue('AI draft text');
    expect(textarea).toHaveAttribute('readonly');
    expect(screen.queryByText('Save correction')).not.toBeInTheDocument();
  });

  it('regenerate calls the existing regenerateContent endpoint and shows the Review notice', async () => {
    vi.mocked(api.avatar).mockResolvedValue(centre as never);
    vi.mocked(api.wikiPages).mockResolvedValue({ data: [wikiPage()] });
    vi.mocked(api.getWikiPage).mockResolvedValue({ data: wikiPage() });
    renderWithClient(<BrainPagesSection avatarId="av-1" orgId="org-1" classId="cls-1" />);

    fireEvent.click(await screen.findByText('View'));
    fireEvent.click(await screen.findByText('Regenerate lessons from this page'));

    await waitFor(() =>
      expect(api.regenerateContent).toHaveBeenCalledWith('org-1', 'cls-1', 'photosynthesis', undefined)
    );
    expect(await screen.findByText(/review .* approve it in the/i)).toBeInTheDocument();
  });

  it('does not offer regenerate without an org/class context', async () => {
    vi.mocked(api.avatar).mockResolvedValue(centre as never);
    vi.mocked(api.wikiPages).mockResolvedValue({ data: [wikiPage()] });
    vi.mocked(api.getWikiPage).mockResolvedValue({ data: wikiPage() });
    renderWithClient(<BrainPagesSection avatarId="av-1" />);

    fireEvent.click(await screen.findByText('View'));
    await screen.findByDisplayValue('AI draft text');
    expect(screen.queryByText('Regenerate lessons from this page')).not.toBeInTheDocument();
  });
});
