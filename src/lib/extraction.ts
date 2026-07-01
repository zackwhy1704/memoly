// Shared extraction-quality signal for uploaded material. Input quality is the
// #1 driver of wiki/marking quality, so we surface it at a glance: a file that
// read as ~empty won't train well and should be re-uploaded or typed.

export type ExtractionTone = 'ok' | 'low' | 'empty';

export interface ExtractionState {
  tone: ExtractionTone;
  label: string;
}

/** ~chars per English word, for a friendly word estimate. */
const CHARS_PER_WORD = 6;
/** Below this many characters, the extraction is too thin to train reliably. */
const LOW_THRESHOLD = 200;

export function extractionState(chars: number | undefined | null): ExtractionState {
  const n = chars ?? 0;
  if (n <= 0) return { tone: 'empty', label: 'No text — re-upload or type' };
  if (n < LOW_THRESHOLD) return { tone: 'low', label: 'Low text — may not train well' };
  const words = Math.round(n / CHARS_PER_WORD);
  return { tone: 'ok', label: `Read OK (~${words.toLocaleString()} words)` };
}

/** Tailwind classes per tone for a small badge. */
export function extractionBadgeClasses(tone: ExtractionTone): string {
  switch (tone) {
    case 'ok': return 'bg-teal-900/40 text-teal-300';
    case 'low': return 'bg-amber-900/40 text-amber-300';
    case 'empty': return 'bg-red-900/40 text-red-300';
  }
}
