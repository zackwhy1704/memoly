/**
 * The i18n message registry — ARB-equivalent for memoly. English is the
 * source of truth for KEYS (every other locale's dictionary is typed against
 * this file's key set, mirroring pally's ARB-key-parity discipline).
 *
 * Scaffolding only: this PR proves the mechanism (registry → context →
 * picker), it does not translate the ~650-750 in-scope dashboard strings
 * (see the Phase 0 sizing report) — that's the follow-up work this PR is
 * sized to make possible, not the PR itself.
 */
export const en = {
  settingsLanguageLabel: 'Language',
  settingsLanguageEnglish: 'English',
  settingsLanguageChinese: '中文',
};

export type MessageKey = keyof typeof en;
