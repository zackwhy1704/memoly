import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ClassAvatar, { glyphEmoji } from '@/components/ClassAvatar';
import type { ClassAvatarAppearance } from '@/lib/api';

describe('glyphEmoji', () => {
  it('maps known subject glyph keys to emoji', () => {
    expect(glyphEmoji('math')).toBe('➗');
    expect(glyphEmoji('science')).toBe('🧪');
    expect(glyphEmoji('coding')).toBe('💻');
  });

  it('is case-insensitive', () => {
    expect(glyphEmoji('MATH')).toBe('➗');
    expect(glyphEmoji('Science')).toBe('🧪');
  });

  it('falls back to the neutral book glyph for unknown or missing keys', () => {
    expect(glyphEmoji('quantum-basket-weaving')).toBe('📖');
    expect(glyphEmoji(undefined)).toBe('📖');
  });
});

describe('ClassAvatar', () => {
  const appearance: ClassAvatarAppearance = {
    bandColorHex: '#7042ED',
    subjectGlyph: 'math',
    initials: 'P4',
  };

  it('renders the base Mochi untouched, a band-coloured ring, and the subject glyph chip', () => {
    const { container } = render(<ClassAvatar appearance={appearance} />);

    const badge = screen.getByRole('img', { name: /Class avatar P4/i });
    expect(badge).toBeInTheDocument();

    // The base Mochi asset is rendered untouched (identity sits AROUND it).
    const mochi = container.querySelector('img[src="/mochi-base.svg"]');
    expect(mochi).toBeInTheDocument();

    // The band colour drives the ring border, not the whole avatar body.
    const ring = container.querySelector('div.rounded-full');
    expect(ring).toHaveStyle({ border: '3px solid #7042ED' });

    // Subject glyph lives in the corner chip.
    expect(screen.getByText('➗')).toBeInTheDocument();
  });

  it('shows initials in the chip only at size >= 64', () => {
    const { rerender } = render(<ClassAvatar appearance={appearance} size={48} />);
    expect(screen.queryByText('P4')).not.toBeInTheDocument();

    rerender(<ClassAvatar appearance={appearance} size={64} />);
    expect(screen.getByText('P4')).toBeInTheDocument();
  });

  it('uses an unknown-glyph fallback without crashing', () => {
    render(
      <ClassAvatar
        appearance={{ bandColorHex: '#FF0000', subjectGlyph: 'astrology', initials: 'X' }}
        size={64}
      />
    );
    expect(screen.getByText('📖')).toBeInTheDocument();
    expect(screen.getByText('X')).toBeInTheDocument();
  });

  it('renders a safe default when appearance is null', () => {
    const { container } = render(<ClassAvatar appearance={null} />);
    const badge = screen.getByRole('img', { name: /Class avatar/i });
    expect(badge).toBeInTheDocument();
    // Default band colour drives the ring; neutral glyph; no initials at default size.
    const ring = container.querySelector('div.rounded-full');
    expect(ring).toHaveStyle({ border: '3px solid #7042ED' });
    expect(screen.getByText('📖')).toBeInTheDocument();
  });

  it('respects the size prop', () => {
    render(<ClassAvatar appearance={appearance} size={64} />);
    const badge = screen.getByRole('img', { name: /Class avatar P4/i });
    expect(badge).toHaveStyle({ width: '64px', height: '64px' });
  });
});
