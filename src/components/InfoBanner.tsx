'use client';

import { useState, useEffect } from 'react';

type Variant = 'tip' | 'warn' | 'info';

const VARIANT_STYLES: Record<Variant, { bg: string; border: string; text: string; icon: string }> = {
  tip:  { bg: 'bg-accent/10', border: 'border-accent/20', text: 'text-ink',  icon: '💡' },
  warn: { bg: 'bg-warn/10',   border: 'border-warn/20',   text: 'text-ink',  icon: '⚠️' },
  info: { bg: 'bg-accent/10', border: 'border-accent/20', text: 'text-ink2', icon: 'ℹ️' },
};

/**
 * Dismissible info/tip/warn banner. Dismiss state is saved to localStorage.
 */
export default function InfoBanner({
  id,
  variant = 'tip',
  children,
}: {
  /** Unique key for localStorage dismiss tracking. */
  id: string;
  variant?: Variant;
  children: React.ReactNode;
}) {
  const storageKey = `memoly_banner_dismissed_${id}`;
  const [dismissed, setDismissed] = useState(true); // default hidden to avoid flash

  useEffect(() => {
    setDismissed(localStorage.getItem(storageKey) === '1');
  }, [storageKey]);

  if (dismissed) return null;

  const s = VARIANT_STYLES[variant];

  function dismiss() {
    localStorage.setItem(storageKey, '1');
    setDismissed(true);
  }

  return (
    <div className={`${s.bg} border ${s.border} rounded-xl px-4 py-3 text-sm ${s.text} flex items-start gap-3`}>
      <span className="shrink-0 text-base leading-none mt-0.5">{s.icon}</span>
      <div className="flex-1 min-w-0">{children}</div>
      <button
        onClick={dismiss}
        className="shrink-0 text-ink3 hover:text-ink2 transition-colors text-xs leading-none mt-0.5"
        aria-label="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
