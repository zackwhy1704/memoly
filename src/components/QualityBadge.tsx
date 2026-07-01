// One shared quality/confidence signal used for BOTH input (upload extraction)
// and output (per-page brain confidence), so teachers learn a single mental
// model: colour + word + %. Never a bare number — always word + colour, and an
// optional "See tips" action for fair/poor. A nudge, not a block.

export type QualityBand = 'good' | 'fair' | 'poor';

const BAND_CLASSES: Record<QualityBand, string> = {
  good: 'bg-teal-900/40 text-teal-300',
  fair: 'bg-amber-900/40 text-amber-300',
  poor: 'bg-red-900/40 text-red-300',
};

export function QualityBadge({
  band, label, pct, tooltip, tipsHref,
}: {
  band: QualityBand;
  label: string;
  pct?: number;
  tooltip?: string;
  tipsHref?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${BAND_CLASSES[band]}`}
      title={tooltip}
    >
      {label}{typeof pct === 'number' ? ` · ${pct}%` : ''}
      {tipsHref && band !== 'good' && (
        <a href={tipsHref} target="_blank" rel="noreferrer" className="underline underline-offset-2">
          tips
        </a>
      )}
    </span>
  );
}

// ── Input: extraction quality (from extractedChars) ───────────────────────
const CHARS_PER_WORD = 6;
const LOW_CHARS = 200;

export function extractionBadge(chars: number | undefined | null): {
  band: QualityBand; label: string; pct: number;
} {
  const n = chars ?? 0;
  if (n <= 0) return { band: 'poor', label: 'No text — re-upload or type', pct: 15 };
  if (n < LOW_CHARS) return { band: 'fair', label: 'Low text — may not train well', pct: 55 };
  const words = Math.round(n / CHARS_PER_WORD);
  return { band: 'good', label: `Read OK (~${words.toLocaleString()} words)`, pct: 95 };
}

// ── Output: per-page confidence (from certaintyScore 0..1, or certainty enum) ─
export function confidenceBadge(
  certaintyScore: number | undefined | null,
  certaintyEnum?: string | null,
): { band: QualityBand; label: string; pct: number; tooltip: string } {
  // Prefer the numeric score; fall back to the enum when the score is absent.
  let score = certaintyScore;
  if (score == null && certaintyEnum) {
    const e = certaintyEnum.toUpperCase();
    score = e === 'VERIFIED' ? 0.95 : e === 'UNCERTAIN' || e === 'CONFLICTED' ? 0.35 : 0.5;
  }
  const s = score ?? 0.5;
  const pct = Math.round(s * 100);
  if (s >= 0.75) {
    return { band: 'good', label: 'Confident', pct,
      tooltip: 'Mochi is confident about this page.' };
  }
  if (s >= 0.45) {
    return { band: 'fair', label: 'Fairly sure', pct,
      tooltip: 'Mochi is fairly sure — add clearer notes to strengthen this page.' };
  }
  return { band: 'poor', label: 'Less sure', pct,
    tooltip: 'Mochi is less sure here — add clearer notes / a clearer exemplar to improve.' };
}

export const NOTES_TIPS_HREF = '/support';
