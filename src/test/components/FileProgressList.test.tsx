import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FileProgressList from '@/components/MochiUploader/FileProgressList';
import { type FileProgress } from '@/lib/upload-pipeline';

const noop = vi.fn();

const baseProps = {
  running: false,
  reviewExpanded: {},
  reviewTexts: {},
  reviewSaving: {},
  onRetry: noop,
  onRemove: noop,
  onSwitchToPaste: noop,
  onReviewExpand: noop,
  onReviewTextChange: noop,
  onReviewApprove: noop,
  onReviewEdit: noop,
  onReviewCancel: noop,
};

describe('FileProgressList', () => {
  it('renders nothing when the progress array is empty', () => {
    const { container } = render(
      <FileProgressList {...baseProps} progress={[]} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders a list item for each file in progress', () => {
    const progress: FileProgress[] = [
      { name: 'notes.pdf', stage: 'queued' },
      { name: 'slides.pdf', stage: 'uploading' },
    ];
    render(<FileProgressList {...baseProps} progress={progress} />);
    expect(screen.getByText('notes.pdf')).toBeInTheDocument();
    expect(screen.getByText('slides.pdf')).toBeInTheDocument();
  });

  it('shows "Uploading…" helper text for a file in uploading stage', () => {
    const progress: FileProgress[] = [
      { name: 'doc.pdf', stage: 'uploading' },
    ];
    render(<FileProgressList {...baseProps} progress={progress} />);
    expect(screen.getByText('Uploading...')).toBeInTheDocument();
  });

  it('shows page count when a file is done with pageCount', () => {
    const progress: FileProgress[] = [
      { name: 'chapter.pdf', stage: 'done', pageCount: 12 },
    ];
    render(<FileProgressList {...baseProps} progress={progress} />);
    expect(screen.getByText('12 pages compiled')).toBeInTheDocument();
  });

  it('shows a Retry button for error-stage files with a file reference', () => {
    const onRetry = vi.fn();
    const progress: FileProgress[] = [
      { name: 'broken.pdf', stage: 'error', file: new File([], 'broken.pdf') },
    ];
    render(<FileProgressList {...baseProps} progress={progress} onRetry={onRetry} />);
    const retryBtn = screen.getByRole('button', { name: 'Retry' });
    fireEvent.click(retryBtn);
    expect(onRetry).toHaveBeenCalledWith(0);
  });

  it('shows a Remove button for warning-stage low-relevance files', () => {
    const onRemove = vi.fn();
    const progress: FileProgress[] = [
      { name: 'off-topic.pdf', stage: 'warning', lowRelevance: true, message: 'Low relevance' },
    ];
    render(<FileProgressList {...baseProps} progress={progress} onRemove={onRemove} />);
    const removeBtn = screen.getByRole('button', { name: 'Remove' });
    fireEvent.click(removeBtn);
    expect(onRemove).toHaveBeenCalledWith(0);
  });

  it('shows "Type instead" button for REJECTED files and calls onSwitchToPaste', () => {
    const onSwitchToPaste = vi.fn();
    const progress: FileProgress[] = [
      { name: 'image.png', stage: 'done', quality: 'REJECTED' },
    ];
    render(
      <FileProgressList {...baseProps} progress={progress} onSwitchToPaste={onSwitchToPaste} />
    );
    const typeBtn = screen.getByRole('button', { name: 'Type instead' });
    fireEvent.click(typeBtn);
    expect(onSwitchToPaste).toHaveBeenCalledTimes(1);
  });

  it('shows "Review extracted text" for BORDERLINE files with extractedText and fileId', () => {
    const onReviewExpand = vi.fn();
    const progress: FileProgress[] = [
      {
        name: 'scan.pdf',
        stage: 'done',
        quality: 'BORDERLINE',
        extractedText: 'Some extracted text',
        fileId: 'file-123',
      },
    ];
    render(
      <FileProgressList {...baseProps} progress={progress} onReviewExpand={onReviewExpand} />
    );
    const reviewBtn = screen.getByRole('button', { name: 'Review extracted text' });
    fireEvent.click(reviewBtn);
    expect(onReviewExpand).toHaveBeenCalledWith(0);
  });
});
