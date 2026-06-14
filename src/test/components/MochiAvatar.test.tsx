import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MochiAvatar from '@/components/MochiAvatar';
import {
  BODY_VARIANTS,
  DEFAULT_MOCHI_CONFIG,
  randomMochiConfig,
  type MochiConfig,
} from '@/lib/api';

describe('randomMochiConfig', () => {
  it('returns indices and enum values that are always in range', () => {
    for (let i = 0; i < 200; i++) {
      const c = randomMochiConfig();
      expect(c.body).toBeGreaterThanOrEqual(0);
      expect(c.body).toBeLessThan(BODY_VARIANTS.length);
      expect(['none', 'bow', 'cap', 'glasses', 'crown', 'headband']).toContain(c.accessory);
      expect(['none', 'sparkle', 'fire', 'chill', 'electric', 'bloom']).toContain(c.aura);
    }
  });

  it('does not include eye or cheek fields', () => {
    const c = randomMochiConfig();
    expect(c).not.toHaveProperty('eyes');
    expect(c).not.toHaveProperty('cheek');
  });
});

describe('MochiAvatar', () => {
  const config: MochiConfig = {
    body: 2,
    accessory: 'crown',
    aura: 'sparkle',
  };

  it('renders the base PNG with the body filter applied', () => {
    const { container } = render(<MochiAvatar config={config} />);
    const img = container.querySelector('img[src="/mochi-base-transparent.png"]') as HTMLImageElement;
    expect(img).toBeInTheDocument();
    expect(img.style.filter).toBe(BODY_VARIANTS[2].filter);
  });

  it('renders an SVG overlay (accessory/aura)', () => {
    const { container } = render(<MochiAvatar config={config} />);
    const svgs = container.querySelectorAll('svg');
    // The accessory + aura overlay SVG (no separate cheek/eye SVGs).
    expect(svgs.length).toBeGreaterThanOrEqual(1);
  });

  it('respects the size prop', () => {
    render(<MochiAvatar config={DEFAULT_MOCHI_CONFIG} size={140} />);
    const badge = screen.getByRole('img', { name: /Mochi avatar/i });
    expect(badge).toHaveStyle({ width: '140px', height: '140px' });
  });

  it('omits the breathing animation when animate=false', () => {
    const { container } = render(<MochiAvatar config={config} animate={false} />);
    const img = container.querySelector('img[src="/mochi-base-transparent.png"]') as HTMLImageElement;
    expect(img.style.animation).toBe('');
  });

  it('clamps out-of-range body index instead of crashing', () => {
    const bad: MochiConfig = { ...config, body: 999 };
    const { container } = render(<MochiAvatar config={bad} />);
    const img = container.querySelector('img[src="/mochi-base-transparent.png"]') as HTMLImageElement;
    // Clamped to last body variant.
    expect(img.style.filter).toBe(BODY_VARIANTS[BODY_VARIANTS.length - 1].filter);
  });
});
