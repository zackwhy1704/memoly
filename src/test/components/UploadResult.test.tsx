import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import UploadResult from '@/components/MochiUploader/UploadResult';

describe('UploadResult', () => {
  it('renders nothing when ok=0 and failed=0', () => {
    const { container } = render(
      <UploadResult ok={0} failed={0} brainReady={false} wikiPageCount={0} onUploadMore={vi.fn()} />
    );
    expect(container.firstChild).toBeNull();
  });

  describe('success state (ok > 0)', () => {
    it('renders the compiled wiki message when brainReady is true', () => {
      render(
        <UploadResult
          ok={2}
          failed={0}
          brainReady={true}
          wikiPageCount={5}
          onUploadMore={vi.fn()}
        />
      );
      expect(
        screen.getByText(/Compiled into the class wiki/)
      ).toBeInTheDocument();
      expect(screen.getByText(/5 pages total/)).toBeInTheDocument();
    });

    it('renders the still-compiling message when brainReady is false', () => {
      render(
        <UploadResult
          ok={1}
          failed={0}
          brainReady={false}
          wikiPageCount={0}
          onUploadMore={vi.fn()}
        />
      );
      expect(screen.getByText(/Still compiling in the background/)).toBeInTheDocument();
    });

    it('shows failed-file count alongside success when some files failed', () => {
      render(
        <UploadResult
          ok={3}
          failed={1}
          brainReady={true}
          wikiPageCount={0}
          onUploadMore={vi.fn()}
        />
      );
      expect(screen.getByText(/1 file failed/)).toBeInTheDocument();
    });

    it('renders a "View content" link when classId is provided', () => {
      render(
        <UploadResult
          ok={1}
          failed={0}
          brainReady={true}
          wikiPageCount={0}
          classId="cls-99"
          onUploadMore={vi.fn()}
        />
      );
      const link = screen.getByRole('link', { name: 'View content' });
      expect(link).toHaveAttribute('href', '/dashboard/classes/cls-99');
    });

    it('calls onUploadMore when "Upload more" is clicked', () => {
      const onUploadMore = vi.fn();
      render(
        <UploadResult
          ok={1}
          failed={0}
          brainReady={true}
          wikiPageCount={0}
          onUploadMore={onUploadMore}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: 'Upload more' }));
      expect(onUploadMore).toHaveBeenCalledTimes(1);
    });
  });

  // ── PARTIAL compile (failed PAGES, distinct from failed FILES) ──────────
  // Phase 0/3/4: a partial compile reaches brainReady but is missing pages. The
  // teacher MUST see a warning naming the failed topics — not silent success.
  describe('partial compile state (failedPages > 0)', () => {
    const failedPages = [
      { slug: 'osmosis', reason: 'DataIntegrity: conflict_note' },
      { slug: 'mitosis', reason: 'boom' },
    ];

    it('renders a warning naming the failed topics and an honest X-of-Y count', () => {
      render(
        <UploadResult
          ok={2}
          failed={0}
          brainReady={true}
          wikiPageCount={6}
          failedPages={failedPages}
          onUploadMore={vi.fn()}
        />
      );
      expect(screen.getByText(/Brain incomplete/)).toBeInTheDocument();
      expect(screen.getByText(/6 of 8 pages compiled/)).toBeInTheDocument();
      expect(screen.getByText(/2 failed/)).toBeInTheDocument();
      expect(screen.getByText(/osmosis, mitosis/)).toBeInTheDocument();
    });

    it('does NOT render the full-success copy when pages failed', () => {
      render(
        <UploadResult
          ok={2}
          failed={0}
          brainReady={true}
          wikiPageCount={6}
          failedPages={failedPages}
          onUploadMore={vi.fn()}
        />
      );
      expect(screen.queryByText(/Compiled into the class wiki/)).not.toBeInTheDocument();
      expect(screen.queryByText(/students can now learn from it/)).not.toBeInTheDocument();
    });

    it('offers a Recompile retry that calls onRetryCompile', () => {
      const onRetryCompile = vi.fn();
      render(
        <UploadResult
          ok={2}
          failed={0}
          brainReady={true}
          wikiPageCount={6}
          failedPages={failedPages}
          onUploadMore={vi.fn()}
          onRetryCompile={onRetryCompile}
        />
      );
      fireEvent.click(screen.getByRole('button', { name: 'Recompile' }));
      expect(onRetryCompile).toHaveBeenCalledTimes(1);
    });

    it('REGRESSION: failedPages=[] renders the unchanged full-success copy', () => {
      render(
        <UploadResult
          ok={2}
          failed={0}
          brainReady={true}
          wikiPageCount={6}
          failedPages={[]}
          onUploadMore={vi.fn()}
        />
      );
      expect(screen.getByText(/Compiled into the class wiki/)).toBeInTheDocument();
      expect(screen.queryByText(/Brain incomplete/)).not.toBeInTheDocument();
    });

    it('keeps the file-upload `failed` axis SEPARATE from page failures', () => {
      // 1 failed FILE upload + 2 failed compile PAGES — both surfaced, not conflated.
      render(
        <UploadResult
          ok={2}
          failed={1}
          brainReady={true}
          wikiPageCount={6}
          failedPages={failedPages}
          onUploadMore={vi.fn()}
        />
      );
      expect(screen.getByText(/Brain incomplete/)).toBeInTheDocument();      // page failures
      expect(screen.getByText(/1 file failed/)).toBeInTheDocument();          // file failures
    });
  });

  describe('error state (ok=0, failed > 0)', () => {
    it('renders the failed-upload error message', () => {
      render(
        <UploadResult ok={0} failed={2} brainReady={false} wikiPageCount={0} onUploadMore={vi.fn()} />
      );
      expect(screen.getByText(/2 files failed to upload/)).toBeInTheDocument();
    });

    it('calls onUploadMore when "Try different files" is clicked', () => {
      const onUploadMore = vi.fn();
      render(
        <UploadResult ok={0} failed={1} brainReady={false} wikiPageCount={0} onUploadMore={onUploadMore} />
      );
      fireEvent.click(screen.getByRole('button', { name: 'Try different files' }));
      expect(onUploadMore).toHaveBeenCalledTimes(1);
    });
  });
});
