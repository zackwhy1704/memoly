import { WikiPage } from '@/lib/api';

const CERTAINTY_STYLE: Record<string, { label: string; cls: string }> = {
  VERIFIED: { label: 'Verified', cls: 'bg-green-100 text-green-700' },
  INFERRED: { label: 'Inferred', cls: 'bg-amber-100 text-amber-700' },
  CONFLICTED: { label: 'Conflict ⚠', cls: 'bg-red-100 text-red-700' },
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
    <div className={`bg-white rounded-xl border shadow-sm p-5 hover:shadow-md transition-shadow
      ${page.hasConflict ? 'border-red-200' : 'border-gray-100'}`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="font-bold text-gray-900 text-sm leading-snug flex-1">{page.title}</h3>
        <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${certainty.cls}`}>
          {certainty.label}
        </span>
      </div>

      {/* Content preview */}
      <p className="text-gray-600 text-sm leading-relaxed mb-3">{preview}</p>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span className="font-mono bg-gray-50 px-2 py-0.5 rounded">{page.slug}</span>
        <span>Updated {updatedAt}</span>
      </div>
    </div>
  );
}
