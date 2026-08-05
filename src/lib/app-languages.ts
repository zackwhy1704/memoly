/**
 * A language memoly's UI can render in. Mirrors pally's `AppLanguages`
 * registry (lib/core/i18n/app_languages.dart) — same shape (code/endonym),
 * same "single source of truth, append one entry to add a language"
 * discipline. This registry is UI chrome only; an avatar's `content_language`
 * (what the AI generates in) is a separate axis, not modelled here.
 */
export interface AppLanguage {
  /** BCP-47 primary subtag, e.g. `en`, `zh`. Matches the backend's
   *  `preferred_locale` values and pally's ARB file suffix convention. */
  code: string;
  /** The language's name IN that language ("English", "中文") — shown in the
   *  picker untranslated so a speaker recognises their own language
   *  regardless of the current UI language. */
  endonym: string;
}

/** Every supported UI language. Append here to add one — no other file
 *  should hand-list languages. */
export const APP_LANGUAGES: AppLanguage[] = [
  { code: 'en', endonym: 'English' },
  { code: 'zh', endonym: '中文' },
];

/** The guaranteed fallback — always present, always the last resort. */
export const FALLBACK_LANGUAGE: AppLanguage = APP_LANGUAGES[0];

/**
 * The registry entry for `code`, or undefined if unsupported. Case-
 * insensitive on the primary subtag; ignores any region/script suffix
 * (`zh-Hans-SG` still resolves to `zh`) — mirrors `AppLanguages.byCode`.
 */
export function languageByCode(code?: string | null): AppLanguage | undefined {
  if (!code) return undefined;
  const primary = code.split(/[-_]/)[0].toLowerCase();
  return APP_LANGUAGES.find((l) => l.code === primary);
}
