import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InfoBanner from '@/components/InfoBanner';

// ── Mock localStorage ────────────────────────────────────────────────
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, val: string) => { store[key] = val; }),
    removeItem: vi.fn((key: string) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
    get length() { return Object.keys(store).length; },
    key: vi.fn((_i: number) => null),
  };
})();

beforeEach(() => {
  vi.stubGlobal('localStorage', localStorageMock);
  localStorageMock.clear();
  vi.clearAllMocks();
});

describe('InfoBanner', () => {
  it('renders tip variant with correct icon and content', async () => {
    // InfoBanner defaults to hidden (dismissed=true) then reads localStorage in useEffect
    // We need to ensure localStorage returns null (not dismissed)
    const { container } = render(
      <InfoBanner id="test-tip" variant="tip">
        <p>Helpful tip here</p>
      </InfoBanner>
    );

    // useEffect fires after render — the banner should now be visible
    // since localStorage returns null for the key
    await screen.findByText('Helpful tip here');
    expect(screen.getByText('💡')).toBeInTheDocument();

    // Check tip styling
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain('bg-accent');
  });

  it('renders warn variant with warning icon', async () => {
    render(
      <InfoBanner id="test-warn" variant="warn">
        <p>Watch out!</p>
      </InfoBanner>
    );

    await screen.findByText('Watch out!');
    expect(screen.getByText('⚠️')).toBeInTheDocument();

    // Warn variant uses warn colors
    const wrapper = screen.getByText('Watch out!').closest('div[class*="bg-warn"]');
    expect(wrapper).not.toBeNull();
  });

  it('renders info variant with info icon', async () => {
    render(
      <InfoBanner id="test-info" variant="info">
        <p>FYI</p>
      </InfoBanner>
    );

    await screen.findByText('FYI');
    expect(screen.getByText('ℹ️')).toBeInTheDocument();
  });

  it('dismisses on click and saves to localStorage', async () => {
    const user = userEvent.setup();
    render(
      <InfoBanner id="dismiss-test" variant="tip">
        <p>Dismiss me</p>
      </InfoBanner>
    );

    await screen.findByText('Dismiss me');

    const dismissBtn = screen.getByRole('button', { name: /dismiss/i });
    await user.click(dismissBtn);

    // Should save dismissal to localStorage
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'memoly_banner_dismissed_dismiss-test',
      '1'
    );

    // Banner should no longer be visible
    expect(screen.queryByText('Dismiss me')).not.toBeInTheDocument();
  });

  it('stays dismissed on re-render when localStorage has the dismiss flag', async () => {
    // Pre-set the dismiss flag
    localStorageMock.setItem('memoly_banner_dismissed_already-gone', '1');

    render(
      <InfoBanner id="already-gone" variant="tip">
        <p>You should not see this</p>
      </InfoBanner>
    );

    // Give useEffect time to run — the banner should stay hidden
    // because localStorage returns '1'
    await act(async () => {});

    expect(screen.queryByText('You should not see this')).not.toBeInTheDocument();
  });
});
