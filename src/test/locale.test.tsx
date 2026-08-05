import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { languageByCode, APP_LANGUAGES, FALLBACK_LANGUAGE } from '@/lib/app-languages';

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return { ...actual, api: { ...actual.api, getMe: vi.fn(), setPreferredLocale: vi.fn() } };
});

import { api } from '@/lib/api';
import { LocaleProvider, useLocale } from '@/lib/locale';

const mockedGetMe = vi.mocked(api.getMe);
const mockedSetPreferredLocale = vi.mocked(api.setPreferredLocale);

function meResponse(preferredLocale: string) {
  return {
    data: {
      userId: 'u1', email: 'a@b.com', displayName: 'A', setupComplete: true,
      role: 'USER', isCentreStaff: true, isOwner: true, accountStatus: 'ACTIVE',
      defaultAnswerMode: 'GUIDE', preferredLocale,
    },
  };
}

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

function Probe() {
  const { language, setLanguage } = useLocale();
  return (
    <div>
      <span data-testid="code">{language.code}</span>
      <button onClick={() => setLanguage('zh')}>switch</button>
    </div>
  );
}

describe('AppLanguages registry', () => {
  it('resolves exact and region-suffixed codes, degrades unknown to undefined', () => {
    expect(languageByCode('en')?.code).toBe('en');
    expect(languageByCode('zh')?.code).toBe('zh');
    // Region/script suffix still resolves to the primary subtag — mirrors
    // pally's AppLanguages.byCode('zh-Hans-SG') => zh.
    expect(languageByCode('zh-Hans-SG')?.code).toBe('zh');
    expect(languageByCode('fr')).toBeUndefined();
    expect(languageByCode(null)).toBeUndefined();
  });

  it('English is first (the guaranteed fallback)', () => {
    expect(APP_LANGUAGES[0].code).toBe('en');
    expect(FALLBACK_LANGUAGE.code).toBe('en');
  });
});

describe('LocaleProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('with nothing persisted and no server data yet, defaults to English', () => {
    mockedGetMe.mockReturnValue(new Promise(() => {})); // never resolves
    renderWithProviders(
      <LocaleProvider><Probe /></LocaleProvider>
    );
    expect(screen.getByTestId('code').textContent).toBe('en');
  });

  it('with nothing persisted locally, reconciles from the server preferredLocale', async () => {
    mockedGetMe.mockResolvedValue(meResponse('zh') as never);
    renderWithProviders(
      <LocaleProvider><Probe /></LocaleProvider>
    );
    await waitFor(() => expect(screen.getByTestId('code').textContent).toBe('zh'));
  });

  it('a local choice already made this session is NOT overwritten by the server value',
    async () => {
      localStorage.setItem('memoly_locale_v1', 'en');
      mockedGetMe.mockResolvedValue(meResponse('zh') as never); // server says zh
      renderWithProviders(
        <LocaleProvider><Probe /></LocaleProvider>
      );
      // Give the useMe() query a chance to resolve, then assert local still wins.
      await waitFor(() => expect(mockedGetMe).toHaveBeenCalled());
      expect(screen.getByTestId('code').textContent).toBe('en');
    });

  it('setLanguage switches the UI language synchronously — proven by making the ' +
    'server PATCH fail and asserting the local switch still applied', async () => {
    // This is the fail-without-fix case pally's LocaleController is explicit
    // about: a failed PATCH must never revert the local choice, because the
    // local pick is the source of truth for THIS device's UI.
    mockedGetMe.mockResolvedValue(meResponse('en') as never);
    mockedSetPreferredLocale.mockRejectedValue(new Error('network error'));

    renderWithProviders(
      <LocaleProvider><Probe /></LocaleProvider>
    );
    await waitFor(() => expect(screen.getByTestId('code').textContent).toBe('en'));

    await userEvent.click(screen.getByText('switch'));

    // UI switches immediately even though the PATCH is guaranteed to reject.
    expect(screen.getByTestId('code').textContent).toBe('zh');
    expect(localStorage.getItem('memoly_locale_v1')).toBe('zh');
    await waitFor(() => expect(mockedSetPreferredLocale).toHaveBeenCalledWith('zh'));
  });
});
