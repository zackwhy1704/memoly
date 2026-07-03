'use client';

import { Fragment } from 'react';

export type StepNo = 1 | 2 | 3;

const STEPS: { n: StepNo; label: string }[] = [
  { n: 1, label: 'Add material' },
  { n: 2, label: 'Mochi builds' },
  { n: 3, label: 'Preview & assign' },
];

/** Persistent 3-step header for the Teach flow. Done steps show ✓ and stay clickable. */
export function TeachStepper({
  current,
  onNavigate,
}: {
  current: StepNo;
  onNavigate?: (n: StepNo) => void;
}) {
  return (
    <div className="flex items-center gap-1 sm:gap-2" role="list" aria-label="Teach steps">
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
                {s.label}
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
