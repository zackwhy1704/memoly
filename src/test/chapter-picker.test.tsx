import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Real ApiError, mocked api methods.
vi.mock('@/lib/api', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
  return {
    ...actual,
    api: { chapters: vi.fn(), compileChunk: vi.fn() },
  };
});

import { api, ApiError, type ChaptersResult } from '@/lib/api';
import ChapterPickerModal from '@/components/ChapterPicker';

const mockedChapters = vi.mocked(api.chapters);
const mockedCompile = vi.mocked(api.compileChunk);

function renderPicker(onClose = vi.fn(), onCompiled = vi.fn()) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <ChapterPickerModal avatarId="av1" onClose={onClose} onCompiled={onCompiled} />
    </QueryClientProvider>
  );
}

const CHAPTERS: ChaptersResult = {
  allowanceUsed: 3,
  allowanceLimit: 5,
  chapters: [
    { chunkId: 'c1', parentFileId: 'p', title: 'Chapter 1', pageFrom: 1, pageTo: 25, pageCount: 25, state: 'LOCKED' },
    { chunkId: 'c2', parentFileId: 'p', title: 'Chapter 2', pageFrom: 26, pageTo: 50, pageCount: 25, state: 'LOCKED' },
    { chunkId: 'c3', parentFileId: 'p', title: 'Chapter 3', pageFrom: 51, pageTo: 60, pageCount: 10, state: 'COMPILED' },
  ],
};

describe('ChapterPickerModal', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders chapters + the allowance counter, nothing pre-selected', async () => {
    mockedChapters.mockResolvedValue({ data: CHAPTERS });
    renderPicker();

    expect(await screen.findByText('Chapter 1')).toBeInTheDocument();
    // counter from ONE source: remaining = 5 - 3 = 2
    expect(screen.getByText('2 of 5 compiles left this month')).toBeInTheDocument();
    // none pre-selected → the compile-selected button is disabled
    expect(screen.getByRole('button', { name: /Compile selected/i })).toBeDisabled();
    // a COMPILED chapter is not selectable
    const boxes = screen.getAllByRole('checkbox');
    expect(boxes.filter((b) => !(b as HTMLInputElement).disabled)).toHaveLength(2);
  });

  it('picking a locked chapter and compiling calls compileChunk for it', async () => {
    mockedChapters.mockResolvedValue({ data: CHAPTERS });
    mockedCompile.mockResolvedValue({ data: { chunkId: 'c1', status: 'READY', allowance: { used: 4, limit: 5 } } });
    renderPicker();

    await screen.findByText('Chapter 1');
    const firstBox = screen.getAllByRole('checkbox').find((b) => !(b as HTMLInputElement).disabled)!;
    await userEvent.click(firstBox);
    await userEvent.click(screen.getByRole('button', { name: /Compile selected/i }));

    await waitFor(() => expect(mockedCompile).toHaveBeenCalledWith('av1', 'c1'));
  });

  it('shows the allowance-hit state (with an upgrade link) on a 402', async () => {
    mockedChapters.mockResolvedValue({ data: CHAPTERS });
    mockedCompile.mockRejectedValue(new ApiError(402, 'CHUNK_COMPILE', 'limit', false));
    renderPicker();

    await screen.findByText('Chapter 1');
    const firstBox = screen.getAllByRole('checkbox').find((b) => !(b as HTMLInputElement).disabled)!;
    await userEvent.click(firstBox);
    await userEvent.click(screen.getByRole('button', { name: /Compile selected/i }));

    expect(await screen.findByText(/used all 5 chapter compiles/i)).toBeInTheDocument();
    const upgrade = screen.getByRole('link', { name: /Upgrade/i });
    expect(upgrade).toHaveAttribute('href', '/account/billing');
  });

  it('offers Compile all when allowance covers every locked chapter', async () => {
    // remaining = 5 - 3 = 2, locked = 2 → covered → shown
    mockedChapters.mockResolvedValue({ data: CHAPTERS });
    renderPicker();
    expect(await screen.findByRole('button', { name: /Compile all \(2\)/i })).toBeInTheDocument();
  });

  it('hides Compile all when allowance cannot cover every locked chapter', async () => {
    // remaining = 5 - 4 = 1 < 2 locked → hidden (student picks individually)
    mockedChapters.mockResolvedValue({ data: { ...CHAPTERS, allowanceUsed: 4 } });
    renderPicker();
    await screen.findByText('Chapter 1');
    expect(screen.queryByRole('button', { name: /Compile all/i })).not.toBeInTheDocument();
  });
});
