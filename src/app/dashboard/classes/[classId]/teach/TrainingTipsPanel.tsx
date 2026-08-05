'use client';

import { useState } from 'react';
import { useTranslation } from '@/lib/messages';
import type { MessageKey } from '@/lib/messages/en';

// Input quality is the #1 driver of lesson quality. This collapsible panel sits
// at the top of Teach Step 1 (Add material). The per-file BORDERLINE "review &
// fix" nudge is handled separately by the uploader's FileProgressList + QualityBadge.

const TIPS: { icon: string; textKey: MessageKey }[] = [
  { icon: '✅', textKey: 'trainingTip1' },
  { icon: '✍️', textKey: 'trainingTip2' },
  { icon: '🔦', textKey: 'trainingTip3' },
  { icon: '📄', textKey: 'trainingTip4' },
  { icon: '🎯', textKey: 'trainingTip5' },
];

export function TrainingTipsPanel() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-accent/5 border border-accent/20 rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-accent/10 transition"
      >
        <span className="text-sm font-semibold text-ink flex items-center gap-2">
          <span aria-hidden="true">💡</span> {t('trainingTipsHeading')}
        </span>
        <span className="text-ink3 text-xs">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <ul className="px-4 pb-4 pt-1 space-y-2 border-t border-accent/15">
          {TIPS.map((tip) => (
            <li key={tip.textKey} className="flex items-start gap-2.5 text-sm text-ink2 leading-relaxed">
              <span aria-hidden="true" className="shrink-0">{tip.icon}</span>
              <span>{t(tip.textKey)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
