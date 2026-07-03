import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TrainingTipsPanel } from '@/app/dashboard/classes/[classId]/teach/TrainingTipsPanel';

describe('TrainingTipsPanel (OCR / training-quality education)', () => {
  it('is collapsed by default and expands to show the 5 tips', () => {
    render(<TrainingTipsPanel />);
    const toggle = screen.getByRole('button', { name: /what trains mochi best/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText(/typed or printed notes/i)).not.toBeInTheDocument();

    fireEvent.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(/typed or printed notes/i)).toBeInTheDocument();
    expect(screen.getByText(/under ~30 pages/i)).toBeInTheDocument();
    expect(screen.getByText(/one topic per file/i)).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(5);
  });
});
