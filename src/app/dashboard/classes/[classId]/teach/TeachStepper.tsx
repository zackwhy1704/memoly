'use client';

import { Fragment } from 'react';
import { useTranslation } from '@/lib/messages';
import type { MessageKey } from '@/lib/messages/en';

export type StepNo = 1 | 2 | 3;

// Exported so the feature tour's Teach-loop copy can be pinned to this exact
// stage sequence (a reorder here fails the tour test instead of silently
// desyncing the narration). labelKey, not label — this file has no component
// context to call t() from; resolution happens at render time.
export const STEPS: { n: StepNo; labelKey: MessageKey }[] = [
  { n: 1, labelKey: 'teachStepAddMaterial' },
  { n: 2, labelKey: 'teachStepMochiBuilds' },
  { n: 3, labelKey: 'teachStepPreviewAssign' },
];

/** Persistent 3-step header for the Teach flow. Done steps show ✓ and stay clickable. */
export function TeachStepper({
  current,
  onNavigate,
}: {
  current: StepNo;
  onNavigate?: (n: StepNo) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-1 sm:gap-2" role="list" aria-label={t('teachStepperAriaLabel')} data-tour="teach-stepper">
      {STEPS.map((s, i) => {
        const state = s.n < current ? 'done' : s.n === current ? 'current' : 'upcoming';
        return (
          <Fragment key={s.n}>
            <button
              role="listitem"
              aria-current={state === 'current' ? 'step' : undefined}
              data-state={state}
              data-testid={`step-${s.n}`}
              onClick={() => onNavigate?.(s.n)}
              className="group flex items-center gap-2 min-w-0"
            >
              <span
                className={`flex items-center justify-center h-6 w-6 rounded-full text-xs font-bold shrink-0 transition ${
                  state === 'current'
                    ? 'bg-accent text-white'
                    : state === 'done'
                      ? 'bg-accent/15 text-accent'
                      : 'bg-panel2 text-ink3'
                }`}
              >
                {state === 'done' ? '✓' : s.n}
              </span>
              <span
                className={`text-sm font-medium whitespace-nowrap truncate ${
                  state === 'current' ? 'text-ink' : state === 'done' ? 'text-ink2' : 'text-ink3'
                }`}
              >
                {t(s.labelKey)}
              </span>
            </button>
            {i < STEPS.length - 1 && (
              <div className={`h-px flex-1 min-w-[12px] ${s.n < current ? 'bg-accent/30' : 'bg-line'}`} />
            )}
          </Fragment>
        );
      })}
    </div>
  );
}
