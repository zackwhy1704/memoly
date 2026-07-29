/**
 * The teaching-language options a class's AI content can be generated in. Single source of truth
 * for the create + edit class modals — the language set is DATA, not a hardcoded pair of options.
 *
 * Adding a language end-to-end still requires (a) backend SupportedLanguage.SUPPORTED gaining the
 * code, (b) a NEW reviewed directive in PromptLanguage (directives encode locale conventions — the
 * zh one encodes Singapore usage), and (c) a native reviewer for that directive. The gate is human
 * review, not this list; but once those exist, the web side is just one more entry here.
 */
export type ContentLanguageCode = 'en' | 'zh';

export const CONTENT_LANGUAGES: ReadonlyArray<{ code: ContentLanguageCode; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'zh', label: '中文 (Simplified)' },
];
