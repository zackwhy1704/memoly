import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ErrorView from '@/components/ErrorView';

describe('ErrorView', () => {
  it('renders the error message', () => {
    render(<ErrorView message="Something went wrong." />);
    expect(screen.getByText('Something went wrong.')).toBeInTheDocument();
  });

  it('renders retry button when onRetry is provided', () => {
    render(<ErrorView message="Error" onRetry={() => {}} />);
    expect(screen.getByText('Try again')).toBeInTheDocument();
  });

  it('does NOT render retry button when onRetry is omitted', () => {
    render(<ErrorView message="Error" />);
    expect(screen.queryByText('Try again')).not.toBeInTheDocument();
  });

  it('calls onRetry when retry button is clicked', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<ErrorView message="Error" onRetry={onRetry} />);

    await user.click(screen.getByText('Try again'));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('applies error styling classes', () => {
    const { container } = render(<ErrorView message="Error" />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain('bg-bad');
    expect(wrapper.className).toContain('border');
  });
});
