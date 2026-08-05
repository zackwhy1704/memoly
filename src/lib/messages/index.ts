'use client';

import { useLocale } from '../locale';
import { en, type MessageKey } from './en';
import { zh } from './zh';

const dictionaries: Record<string, Record<MessageKey, string>> = { en, zh };

/**
 * `t(key)` for the current UI language. Falls back to English on an unknown
 * locale code or a missing key — never throws, never renders a raw key to a
 * teacher (mirrors PromptLanguage/ARB's "fail to English rather than emit
 * something broken" posture used throughout this codebase's i18n work).
 */
export function useTranslation() {
  const { language } = useLocale();
  const dict = dictionaries[language.code] ?? en;
  return function t(key: MessageKey): string {
    return dict[key] ?? en[key] ?? key;
  };
}
