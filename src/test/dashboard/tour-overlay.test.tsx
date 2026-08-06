import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TourOverlay, computeCardStyle } from '@/app/dashboard/classes/[classId]/TourOverlay';
import { TOUR_STEPS } from '@/app/dashboard/classes/[classId]/tourSteps';
import { en } from '@/lib/messages/en';

describe('TourOverlay', () => {
  beforeEach(() => localStorage.clear());

  it('renders the first step, then advances in order on Next', () => {
    render(<TourOverlay onNavigate={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText(en[TOUR_STEPS[0].titleKey])).toBeInTheDocument();
    fireEvent.click(screen.getByText(en[TOUR_STEPS[0].ctaKey!]));
    expect(screen.getByText(en[TOUR_STEPS[1].titleKey])).toBeInTheDocument();
  });

  it('Skip closes with reason "skipped"', () => {
    const onClose = vi.fn();
    render(<TourOverlay onNavigate={vi.fn()} onClose={onClose} />);
    fireEvent.click(screen.getByText('Skip'));
    expect(onClose).toHaveBeenCalledWith('skipped');
  });

  it('Esc closes (skip)', () => {
    const onClose = vi.fn();
    render(<TourOverlay onNavigate={vi.fn()} onClose={onClose} />);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledWith('skipped');
  });

  it('completing the last step closes with reason "completed"', () => {
    const onClose = vi.fn();
    const steps = TOUR_STEPS.slice(0, 1); // single step → its CTA completes
    render(<TourOverlay onNavigate={vi.fn()} onClose={onClose} steps={steps} />);
    fireEvent.click(screen.getByText(en[steps[0].ctaKey!]));
    expect(onClose).toHaveBeenCalledWith('completed');
  });

  it('navigates to the step tab before measuring', () => {
    const onNavigate = vi.fn();
    // Step 2 has tab "content"; advancing should call onNavigate with it.
    render(<TourOverlay onNavigate={onNavigate} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText(en[TOUR_STEPS[0].ctaKey!]));
    expect(onNavigate).toHaveBeenCalledWith('content');
  });

  it('computeCardStyle: a missing anchor centers the card (fallback)', () => {
    const centered = computeCardStyle(null);
    const anchored = computeCardStyle({ top: 100, left: 100, width: 80, height: 30 });
    // Centered card has no anchor-derived left; anchored follows the rect.
    expect(centered.left).not.toBe(anchored.left);
    expect(typeof centered.top).toBe('number');
  });
});
