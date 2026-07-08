'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { trackEvent } from '@/lib/analytics';
import { TOUR_STEPS, type TourStep } from './tourSteps';
import type { Tab } from './sections';

interface Rect { top: number; left: number; width: number; height: number }

/**
 * Hand-rolled, dependency-free tour overlay (matches the repo's zero-tour-lib
 * reality). Navigates real tabs via `onNavigate` BEFORE measuring the step's
 * anchor; a missing/absent anchor falls back to a centered card. Keyboard: Esc =
 * skip, Enter/→ = next. Accessible: role=dialog, focus moved in + restored out.
 */
export function TourOverlay({
  onNavigate,
  onClose,
  steps = TOUR_STEPS,
}: {
  onNavigate: (tab: Tab) => void;
  /** reason: 'completed' | 'skipped' */
  onClose: (reason: 'completed' | 'skipped') => void;
  steps?: TourStep[];
}) {
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const step = steps[index];
  const isLast = index === steps.length - 1;

  // tour_started once; restore focus on unmount.
  useEffect(() => {
    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    trackEvent('tour_started');
    return () => restoreFocusRef.current?.focus?.();
  }, []);

  // Navigate to this step's tab, then measure its anchor (after the tab renders).
  useLayoutEffect(() => {
    trackEvent('tour_step_viewed', { id: step.id });
    if (step.tab) onNavigate(step.tab);
    let raf2 = 0;
    // Two rAFs + a short timeout: let the tab content mount before measuring.
    const t = setTimeout(() => {
      const measure = () => {
        const el = step.anchor
          ? document.querySelector<HTMLElement>(`[data-tour="${step.anchor}"]`)
          : null;
        if (el) {
          const r = el.getBoundingClientRect();
          setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
        } else {
          setRect(null); // centered fallback (no anchor, or not in the tree)
        }
      };
      raf2 = requestAnimationFrame(measure);
    }, step.tab ? 260 : 0);
    return () => {
      clearTimeout(t);
      cancelAnimationFrame(raf2);
    };
  }, [index, step.tab, step.anchor, step.id, onNavigate]);

  // Move focus into the card each step.
  useEffect(() => {
    cardRef.current?.focus();
  }, [index]);

  const next = useCallback(() => {
    if (isLast) {
      trackEvent('tour_completed');
      onClose('completed');
    } else {
      setIndex((i) => i + 1);
    }
  }, [isLast, onClose]);

  const skip = useCallback(() => {
    trackEvent('tour_skipped', { step: step.id });
    onClose('skipped');
  }, [onClose, step.id]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); skip(); }
      else if (e.key === 'Enter' || e.key === 'ArrowRight') { e.preventDefault(); next(); }
      else if (e.key === 'Tab') { e.preventDefault(); } // trap: keep focus on the card
    },
    [skip, next],
  );

  // Card placement: below the anchor if room, else above; centered when no anchor.
  const cardStyle = computeCardStyle(rect);

  return (
    <div
      className="fixed inset-0 z-[100]"
      role="dialog"
      aria-modal="true"
      aria-label="Feature tour"
      onKeyDown={onKeyDown}
    >
      {/* Dimmed backdrop — click to skip */}
      <button
        aria-label="Skip tour"
        className="absolute inset-0 h-full w-full cursor-default bg-black/60"
        onClick={skip}
      />

      {/* Anchor highlight ring */}
      {rect && (
        <div
          className="pointer-events-none absolute rounded-xl ring-2 ring-accent ring-offset-2 ring-offset-transparent"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.0)',
          }}
        />
      )}

      {/* Step card */}
      <div
        ref={cardRef}
        tabIndex={-1}
        data-testid="tour-card"
        className="absolute w-[min(92vw,360px)] rounded-2xl border border-line bg-panel p-5 shadow-2xl outline-none"
        style={cardStyle}
      >
        <div className="mb-3 flex items-center gap-1.5">
          {steps.map((s, i) => (
            <span
              key={s.id}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? 'w-4 bg-accent' : 'w-1.5 bg-line'
              }`}
            />
          ))}
        </div>
        <h3 className="text-base font-semibold text-ink">{step.title}</h3>
        <p className="mt-1.5 text-sm leading-relaxed text-ink2">{step.body}</p>
        <div className="mt-4 flex items-center justify-between">
          {!isLast ? (
            <button
              onClick={skip}
              className="text-xs font-medium text-ink3 hover:text-ink2"
            >
              Skip
            </button>
          ) : (
            <span />
          )}
          <button
            onClick={next}
            className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90"
          >
            {step.cta ?? (isLast ? 'Done' : 'Next')}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Position the card near the anchor (below if room, else above), viewport-
 *  clamped; centered when there is no anchor. Pure so it's trivially testable. */
export function computeCardStyle(rect: Rect | null): React.CSSProperties {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 768;
  const cardW = Math.min(vw * 0.92, 360);
  const cardH = 220; // estimate for clamping
  if (!rect) {
    return {
      top: Math.max(16, vh / 2 - cardH / 2),
      left: Math.max(16, vw / 2 - cardW / 2),
    };
  }
  const belowTop = rect.top + rect.height + 12;
  const fitsBelow = belowTop + cardH < vh;
  const top = fitsBelow ? belowTop : Math.max(16, rect.top - cardH - 12);
  const left = Math.min(Math.max(16, rect.left), vw - cardW - 16);
  return { top: Math.max(16, top), left };
}
