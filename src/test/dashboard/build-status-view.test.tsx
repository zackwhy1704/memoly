import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BuildStatusView } from '@/app/dashboard/classes/[classId]/teach/BuildStatusView';

/**
 * The honesty invariant: the status UI shows REAL numbers only when the backend
 * reports them, "Checking…" when readiness is unknown, and never a false "Ready".
 */
describe('BuildStatusView — honest pipeline status', () => {
  it('shows "Checking…" when readiness is unknown (never a false Ready)', () => {
    render(<BuildStatusView status={{ phase: 'checking' }} />);
    expect(screen.getByText('Checking…')).toBeInTheDocument();
    expect(screen.queryByText(/ready/i)).not.toBeInTheDocument();
  });

  it('shows REAL "N/M pages" only when the backend reports totals', () => {
    render(<BuildStatusView status={{ phase: 'compiling', pagesCompiled: 12, pagesTotal: 47 }} />);
    expect(screen.getByTestId('compile-progress')).toHaveTextContent('Compiling 12/47 pages…');
  });

  it('shows indeterminate "Compiling…" — no invented numbers — when totals are absent', () => {
    render(<BuildStatusView status={{ phase: 'compiling' }} />);
    const el = screen.getByTestId('compile-progress');
    expect(el).toHaveTextContent('Compiling…');
    expect(el.textContent).not.toMatch(/\d/); // no fabricated N/M
  });

  it('celebrates on ready with the real page count + a preview action', () => {
    const onPreview = vi.fn();
    render(<BuildStatusView status={{ phase: 'ready', lessonCount: 6 }} onPreview={onPreview} />);
    expect(screen.getByText('Lessons ready!')).toBeInTheDocument();
    expect(screen.getByText(/compiled 6 pages/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /preview lessons/i })).toBeInTheDocument();
  });

  it('offers Retry on timeout', () => {
    render(<BuildStatusView status={{ phase: 'timeout' }} onRetry={vi.fn()} />);
    expect(screen.getByText(/taking longer than usual/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
  });

  it('surfaces hard-to-read pages with a Review action, not a silent success', () => {
    render(<BuildStatusView status={{ phase: 'ready', lessonCount: 3, failedCount: 2 }} onReview={vi.fn()} />);
    expect(screen.getByText(/2 pages were hard to read/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /review/i })).toBeInTheDocument();
  });
});
