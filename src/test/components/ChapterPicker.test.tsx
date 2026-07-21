import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ChapterPickerModal from '@/components/ChapterPicker';
import { api } from '@/lib/api';

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    api: { ...actual.api, chapters: vi.fn(), compileChunk: vi.fn() },
  };
});

const CHAPTERS = {
  data: {
    allowanceUsed: 0,
    allowanceLimit: 10,
    chapters: [
      { chunkId: 'c1', parentFileId: 'f1', title: 'Chapter 1', pageFrom: 1, pageTo: 4, pageCount: 4, state: 'LOCKED' as const },
      { chunkId: 'c2', parentFileId: 'f1', title: 'Chapter 2', pageFrom: 5, pageTo: 8, pageCount: 4, state: 'LOCKED' as const },
    ],
  },
};

function renderPicker(props?: Partial<Parameters<typeof ChapterPickerModal>[0]>) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onClose = vi.fn();
  const onCompiled = vi.fn();
  render(
    <QueryClientProvider client={client}>
      <ChapterPickerModal avatarId="av1" onClose={onClose} onCompiled={onCompiled} {...props} />
    </QueryClientProvider>
  );
  return { onClose, onCompiled };
}

describe('ChapterPicker — background pick-and-compile (FIX 3)', () => {
  beforeEach(() => vi.clearAllMocks());

  it('CLOSES the picker immediately on pick, WITHOUT awaiting the compile requests', async () => {
    vi.mocked(api.chapters).mockResolvedValue(CHAPTERS as Awaited<ReturnType<typeof api.chapters>>);
    // compileChunk never resolves during the test — proves close does NOT await it.
    let resolveCompile: (() => void) | undefined;
    vi.mocked(api.compileChunk).mockReturnValue(
      new Promise<never>(() => { resolveCompile = () => {}; }) as ReturnType<typeof api.compileChunk>
    );

    const { onClose } = renderPicker();
    await waitFor(() => expect(screen.getByText('Chapter 1')).toBeInTheDocument());

    // Select the first chapter (checkbox order matches list order).
    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    fireEvent.click(screen.getByRole('button', { name: /Compile selected/i }));

    // Closed synchronously even though compileChunk is still pending (never resolved).
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(api.compileChunk).toHaveBeenCalledWith('av1', 'c1');
    void resolveCompile; // silence unused
  });

  it('fires a compile request per picked chapter (enqueue, not block)', async () => {
    vi.mocked(api.chapters).mockResolvedValue(CHAPTERS as Awaited<ReturnType<typeof api.chapters>>);
    vi.mocked(api.compileChunk).mockResolvedValue(
      { data: { chunkId: 'c', status: 'READY' } } as unknown as Awaited<ReturnType<typeof api.compileChunk>>
    );

    const { onClose, onCompiled } = renderPicker();
    await waitFor(() => expect(screen.getByText('Chapter 1')).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Compile all/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(api.compileChunk).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(onCompiled).toHaveBeenCalled());
  });
});
