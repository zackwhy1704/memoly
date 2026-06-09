import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EmptyState from '@/components/EmptyState';

// EmptyState uses next/link, which needs a mock in vitest/jsdom
vi.mock('next/link', () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode; [k: string]: unknown }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

describe('EmptyState', () => {
  it('renders icon, title, and description', () => {
    render(
      <EmptyState
        icon="📊"
        title="No data yet"
        description="Upload some files to get started."
      />
    );
    expect(screen.getByText('📊')).toBeInTheDocument();
    expect(screen.getByText('No data yet')).toBeInTheDocument();
    expect(screen.getByText('Upload some files to get started.')).toBeInTheDocument();
  });

  it('renders icon and title without description', () => {
    render(<EmptyState icon="🔍" title="Nothing found" />);
    expect(screen.getByText('🔍')).toBeInTheDocument();
    expect(screen.getByText('Nothing found')).toBeInTheDocument();
  });

  it('renders CTA link when actionLabel and actionHref are provided', () => {
    render(
      <EmptyState
        icon="📚"
        title="No classes"
        actionLabel="Create a class"
        actionHref="/dashboard/classes/new"
      />
    );
    const link = screen.getByText('Create a class');
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', '/dashboard/classes/new');
  });

  it('renders CTA button when actionLabel and onAction are provided (no href)', async () => {
    const user = userEvent.setup();
    const onAction = vi.fn();
    render(
      <EmptyState
        icon="📚"
        title="No classes"
        actionLabel="Create a class"
        onAction={onAction}
      />
    );
    const button = screen.getByText('Create a class');
    expect(button.tagName).toBe('BUTTON');
    await user.click(button);
    expect(onAction).toHaveBeenCalledOnce();
  });

  it('does NOT render CTA when actionLabel is omitted', () => {
    render(<EmptyState icon="📊" title="Nothing" />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
