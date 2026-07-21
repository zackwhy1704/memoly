import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RelevanceWarningDialog from '@/components/MochiUploader/RelevanceWarningDialog';

describe('RelevanceWarningDialog', () => {
  it('renders the title, the backend reason, and both buttons', () => {
    render(
      <RelevanceWarningDialog
        subject="Biology"
        reason="This file doesn't seem to match Biology."
        onGoBack={vi.fn()}
        onAddAnyway={vi.fn()}
      />
    );

    expect(screen.getByText('Hmm, this might not fit!')).toBeInTheDocument();
    expect(screen.getByText("This file doesn't seem to match Biology.")).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Go Back' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Anyway' })).toBeInTheDocument();
  });

  it('falls back to the subject-based copy when no reason is given (mirrors mobile default)', () => {
    render(
      <RelevanceWarningDialog subject="Chemistry" onGoBack={vi.fn()} onAddAnyway={vi.fn()} />
    );

    expect(
      screen.getByText(/doesn't seem to match "Chemistry"/)
    ).toBeInTheDocument();
  });

  it('"Go Back" calls onGoBack', () => {
    const onGoBack = vi.fn();
    render(
      <RelevanceWarningDialog subject="Biology" onGoBack={onGoBack} onAddAnyway={vi.fn()} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Go Back' }));
    expect(onGoBack).toHaveBeenCalledTimes(1);
  });

  it('"Add Anyway" calls onAddAnyway', () => {
    const onAddAnyway = vi.fn();
    render(
      <RelevanceWarningDialog subject="Biology" onGoBack={vi.fn()} onAddAnyway={onAddAnyway} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Add Anyway' }));
    expect(onAddAnyway).toHaveBeenCalledTimes(1);
  });
});
