import { WikiPage } from '@/lib/api';

const CERTAINTY_STYLE: Record<string, { label: string; cls: string }> = {
  VERIFIED: { label: 'Verified', cls: 'bg-ok/20 text-ok' },
  INFERRED: { label: 'Inferred', cls: 'bg-warn/20 text-warn' },
  CONFLICTED: { label: 'Conflict ⚠', cls: 'bg-bad/20 text-bad' },
};

interface WikiPageCardProps {
  page: WikiPage;
}

export default function WikiPageCard({ page }: WikiPageCardProps) {
  const certainty = CERTAINTY_STYLE[page.certainty] ?? CERTAINTY_STYLE['INFERRED'];
  const preview = page.content.slice(0, 200) + (page.content.length > 200 ? '…' : '');

  const updatedAt = (() => {
    try {
      return new Date(page.updatedAt).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '—';
    }
  })();

  return (
    <div className={`bg-panel rounded-xl border shadow-sm p-5 hover:border-accent/30 transition-colors
      ${page.hasConflict ? 'border-bad/30' : 'border-line'}`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-bold text-ink text-sm leading-snug flex-1">{page.title}</h3>
        <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${certainty.cls}`}>
          {certainty.label}
        </span>
      </div>

      {/* Content preview */}
      <p className="text-ink2 text-sm leading-relaxed mb-3">{preview}</p>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-ink3">
        <span className="font-mono bg-panel2 px-2 py-0.5 rounded">{page.slug}</span>
        <span>Updated {updatedAt}</span>
      </div>
    </div>
  );
}
