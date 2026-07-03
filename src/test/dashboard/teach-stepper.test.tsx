import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TeachStepper } from '@/app/dashboard/classes/[classId]/teach/TeachStepper';

describe('TeachStepper', () => {
  it('marks the current step, prior steps done, later steps upcoming', () => {
    render(<TeachStepper current={2} />);
    expect(screen.getByTestId('step-1')).toHaveAttribute('data-state', 'done');
    expect(screen.getByTestId('step-2')).toHaveAttribute('data-state', 'current');
    expect(screen.getByTestId('step-3')).toHaveAttribute('data-state', 'upcoming');
  });

  it('lets you navigate back to a step', () => {
    const onNavigate = vi.fn();
    render(<TeachStepper current={3} onNavigate={onNavigate} />);
    fireEvent.click(screen.getByTestId('step-1'));
    expect(onNavigate).toHaveBeenCalledWith(1);
  });
});
