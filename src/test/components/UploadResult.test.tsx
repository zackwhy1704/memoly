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
