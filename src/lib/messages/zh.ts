import type { MessageKey } from './en';

/**
 * zh dictionary. Typed as `Record<MessageKey, string>` against en's key set —
 * a key added to en.ts and not here is a TYPE ERROR, not a silent English
 * fallback at build time (the runtime lookup in useTranslation still
 * degrades to English for any key that somehow slips through, matching
 * ARB's "fail to English" posture, but the compiler is the first gate).
 */
export const zh: Record<MessageKey, string> = {
  settingsLanguageLabel: '语言',
  settingsLanguageEnglish: 'English',
  settingsLanguageChinese: '中文',
};
