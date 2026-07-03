'use client';

import { useState } from 'react';

// Input quality is the #1 driver of lesson quality. This collapsible panel sits
// at the top of Teach Step 1 (Add material). The per-file BORDERLINE "review &
// fix" nudge is handled separately by the uploader's FileProgressList + QualityBadge.

const TIPS: { icon: string; text: string }[] = [
  { icon: '✅', text: 'Typed or printed notes give the best lessons.' },
  { icon: '✍️', text: 'Neat handwriting works; cursive or messy is hard — print or type it.' },
  { icon: '🔦', text: 'Photos: good light, no glare, don’t shoot a screen — lay the page flat.' },
  { icon: '📄', text: 'Keep files under ~30 pages — split a textbook by chapter.' },
  { icon: '🎯', text: 'One topic per file → one clean lesson.' },
];

export function TrainingTipsPanel() {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-accent/5 border border-accent/20 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-accent/10 transition"
      >
        <span className="text-sm font-semibold text-ink flex items-center gap-2">
          <span aria-hidden="true">💡</span> What trains Mochi best
        </span>
        <span className="text-ink3 text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <ul className="px-4 pb-4 pt-1 space-y-2 border-t border-accent/15">
          {TIPS.map((t) => (
            <li key={t.text} className="flex items-start gap-2.5 text-sm text-ink2 leading-relaxed">
              <span aria-hidden="true" className="shrink-0">{t.icon}</span>
              <span>{t.text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
