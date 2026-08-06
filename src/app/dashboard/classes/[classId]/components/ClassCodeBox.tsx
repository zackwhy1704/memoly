'use client';

import { useState } from 'react';
import { useTranslation } from '@/lib/messages';

/** Prominent, one-tap-copy class join code shown in the class header. */
export function ClassCodeBox({ code }: { code: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable — code is still visible to type manually */
    }
  }

  return (
    <button
      onClick={copy}
      title={t('classCodeBoxTitle')}
      className="text-right shrink-0 rounded-xl border border-accent/30 bg-accent/5 px-4 py-2
        hover:bg-accent/10 transition-colors"
    >
      <p className="text-[10px] uppercase tracking-wider text-ink3">{t('classCodeBoxLabel')}</p>
      <p className="font-mono text-2xl font-extrabold text-accent tracking-[0.2em] leading-tight">
        {code}
      </p>
      <p className="text-[10px] text-ink3 mt-0.5">{copied ? t('classCodeBoxCopied') : t('classCodeBoxTapToCopy')}</p>
    </button>
  );
}
