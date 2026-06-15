import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import PasteMode from '@/components/MochiUploader/PasteMode';

describe('PasteMode', () => {
  it('renders the paste textarea with its placeholder', () => {
    render(
      <PasteMode value="" submitting={false} onChange={vi.fn()} onSubmit={vi.fn()} />
    );
    expect(
      screen.getByPlaceholderText('Paste or type your teaching materials here...')
    ).toBeInTheDocument();
  });

  it('shows the minimum-characters hint when the textarea is empty', () => {
    render(
      <PasteMode value="" submitting={false} onChange={vi.fn()} onSubmit={vi.fn()} />
    );
    expect(screen.getByText('Minimum 50 characters')).toBeInTheDocument();
  });

  it('submit button is disabled when content is below the minimum', () => {
    render(
      <PasteMode value="short" submitting={false} onChange={vi.fn()} onSubmit={vi.fn()} />
    );
    expect(screen.getByRole('button', { name: 'Add to class content' })).toBeDisabled();
  });

  it('submit button is enabled once content meets the minimum length', () => {
    const longText = 'a'.repeat(50);
    render(
      <PasteMode value={longText} submitting={false} onChange={vi.fn()} onSubmit={vi.fn()} />
    );
    expect(screen.getByRole('button', { name: 'Add to class content' })).not.toBeDisabled();
  });

  it('calls onChange when the textarea value changes', () => {
    const onChange = vi.fn();
    render(
      <PasteMode value="" submitting={false} onChange={onChange} onSubmit={vi.fn()} />
    );
    fireEvent.change(
      screen.getByPlaceholderText('Paste or type your teaching materials here...'),
      { target: { value: 'new text' } }
    );
    expect(onChange).toHaveBeenCalledWith('new text');
  });

  it('calls onSubmit when the button is clicked with sufficient content', () => {
    const onSubmit = vi.fn();
    const longText = 'a'.repeat(50);
    render(
      <PasteMode value={longText} submitting={false} onChange={vi.fn()} onSubmit={onSubmit} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Add to class content' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it('shows "Adding…" and disables the button while submitting', () => {
    const longText = 'a'.repeat(50);
    render(
      <PasteMode value={longText} submitting={true} onChange={vi.fn()} onSubmit={vi.fn()} />
    );
    expect(screen.getByRole('button', { name: 'Adding...' })).toBeDisabled();
  });
});
