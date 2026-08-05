'use client';

import { createContext, useContext, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import { useMe } from './use-me';
import { APP_LANGUAGES, FALLBACK_LANGUAGE, languageByCode, type AppLanguage } from './app-languages';

const LOCALE_STORAGE_KEY = 'memoly_locale_v1';

const LocaleContext = createContext<{
  language: AppLanguage;
  setLanguage: (code: string) => void;
}>({ language: FALLBACK_LANGUAGE, setLanguage: () => {} });

/**
 * Drives the UI language. Mirrors pally's `LocaleController` (same pattern
 * as `ThemeProvider` here for the mechanics: localStorage + React state):
 *
 *  - Local write wins immediately (offline-first): setLanguage updates state
 *    and persists to localStorage before anything else touches the network.
 *  - Server sync is best-effort and MUST NOT block or revert the UI — the
 *    choice is mirrored to the backend's `preferred_locale` (the SAME field
 *    and PATCH /auth/settings/locale endpoint pally's mobile client uses) so
 *    it follows the teacher across web and mobile, but a failed PATCH never
 *    reverts the local choice.
 *  - A device with NO local choice yet falls back to the server's
 *    preferredLocale (read via the existing `useMe()` cache — no new fetch)
 *    once it loads, then to English.
 *
 * `localCode` (an explicit choice, this session or a prior one) is the ONLY
 * React state; the effective `code` is DERIVED each render rather than
 * synced via a useEffect+setState — an effect writing state on every useMe()
 * resolution would trigger react-hooks/set-state-in-effect (cascading
 * renders) for no benefit, since the fallback is a pure function of
 * (localCode, me.preferredLocale) with no side effect to perform.
 *
 * UI chrome only — never touches an avatar's `content_language`.
 */
export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient();
  const { data: me } = useMe();

  const [localCode, setLocalCode] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(LOCALE_STORAGE_KEY);
  });

  const code =
    localCode ??
    (me?.preferredLocale && languageByCode(me.preferredLocale) ? me.preferredLocale : null) ??
    FALLBACK_LANGUAGE.code;

  function setLanguage(newCode: string) {
    const lang = languageByCode(newCode) ?? FALLBACK_LANGUAGE;
    if (lang.code === code) return; // re-entry / no-op guard
    setLocalCode(lang.code); // synchronous local switch — never blocks on the network
    if (typeof window !== 'undefined') {
      localStorage.setItem(LOCALE_STORAGE_KEY, lang.code);
    }
    api
      .setPreferredLocale(lang.code as 'en' | 'zh')
      .then(() => qc.invalidateQueries({ queryKey: ['me'] }))
      .catch(() => {
        // Best-effort mirror only — the local choice already applied above
        // and stays applied. Nothing to surface to the user (this is UI
        // chrome, not a data-loss-risk write).
      });
  }

  const language = languageByCode(code) ?? FALLBACK_LANGUAGE;

  return (
    <LocaleContext.Provider value={{ language, setLanguage }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}

export { APP_LANGUAGES };
