'use client';

import { useLocale } from '../locale';
import { en, type MessageKey } from './en';
import { zh } from './zh';
import { templatesEn, templatesZh, type Templates } from './templates';

const dictionaries: Record<string, Record<MessageKey, string>> = { en, zh };
const templateDictionaries: Record<string, Templates> = { en: templatesEn, zh: templatesZh };

/**
 * `t(key)` for flat strings, `tp` for parameterized sentences (counts,
 * names, dates — see templates.ts for why these are functions per language
 * rather than a shared template with substituted fragments). Both fall back
 * to English on an unknown locale code or a missing key — never throw,
 * never render a raw key to a teacher (mirrors PromptLanguage/ARB's "fail to
 * English rather than emit something broken" posture used throughout this
 * codebase's i18n work).
 */
export function useTranslation() {
  const { language } = useLocale();
  const dict = dictionaries[language.code] ?? en;
  const tp = templateDictionaries[language.code] ?? templatesEn;
  function t(key: MessageKey): string {
    return dict[key] ?? en[key] ?? key;
  }
  return { t, tp };
}
