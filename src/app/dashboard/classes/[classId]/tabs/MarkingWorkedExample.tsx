'use client';

import { useState } from 'react';
import { QualityBadge, confidenceBadge } from '@/components/QualityBadge';
import { useTranslation } from '@/lib/messages';

/**
 * Static, honest worked example for the marking-assistant empty state. It walks a
 * teacher through upload → learn → draft → edit using the SAME UI shapes the real
 * product renders (reference card, "what your assistant has learned" row, the blue
 * AI-draft card with suggestedGrade + criteria). The data is illustrative and
 * clearly tagged "Example" — and deliberately good-but-not-magic (the draft still
 * gets a teacher edit in step 4) so it sets honest expectations, never oversells.
 */
export function MarkingWorkedExample({ onStart }: { onStart: () => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);

  return (
    <div className="bg-panel border border-line rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <span className="text-sm font-semibold text-ink">
          {open ? '▼' : '▶'} {t('workedExampleToggleShow')}
        </span>
        <span className="text-[11px] text-ink3">{t('workedExampleDuration')}</span>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-3 border-t border-line pt-4">
          <p className="text-xs text-ink2 leading-relaxed">
            {t('workedExampleIntro')}
          </p>

          {/* Step 1 — What you upload */}
          <Step n={1} title={t('workedExampleStep1Title')}>
            <div className="rounded-lg bg-panel2 border border-line px-3 py-2 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-ink">{t('workedExampleSpeedQuestion')}</span>
                <ExampleTag />
              </div>
              <p className="text-xs text-ink3 leading-relaxed">
                {t('workedExampleQuestion')} <span className="text-ink2">80</span>
              </p>
              <p className="text-xs text-ink2">
                {t('workedExampleYourMarks')} <span className="font-semibold text-ink">6/8</span> {t('workedExampleMarksDetail')}
                <span className="text-bad font-semibold"> {t('workedExampleNoUnits')}</span> {t('workedExampleCentreRule')}
              </p>
            </div>
          </Step>

          {/* Step 2 — What the assistant learns */}
          <Step n={2} title={t('workedExampleStep2Title')}>
            <ul className="space-y-2">
              <li className="rounded-lg bg-panel2 border border-line px-3 py-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold text-ink">{t('workedExampleCommonDeductions')}</span>
                  <QualityBadge {...confidenceBadge(0.86, 'INFERRED')} />
                </div>
                <p className="text-xs text-ink3 mt-1">
                  {t('workedExampleDeductionDetail')}
                </p>
              </li>
            </ul>
          </Step>

          {/* Step 3 — What you get back (mirrors DetailPanel's blue AI-draft card) */}
          <Step n={3} title={t('workedExampleStep3Title')}>
            <div className="rounded-xl bg-blue-900/15 border border-blue-900/30 px-4 py-3 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-300">
                  {t('workedExampleAiDraft')}
                </p>
                <ExampleTag />
              </div>
              <p className="text-xs text-ink2">
                {t('workedExampleSuggestedGrade')} <span className="font-semibold text-ink">6/8</span>
              </p>
              <p className="text-xs text-ink2">
                <span className="font-medium text-ink">{t('workedExampleMethod')}</span> {t('workedExampleMethodDetail')}
              </p>
              <p className="text-xs text-ink2">
                <span className="font-medium text-ink">{t('workedExampleUnits')}</span> {t('workedExampleUnitsDetail')}
              </p>
            </div>
          </Step>

          {/* Step 4 — You stay in control */}
          <Step n={4} title={t('workedExampleStep4Title')}>
            <div className="rounded-lg bg-panel2 border border-line px-3 py-2 space-y-1.5">
              <p className="text-xs text-ink3">
                <span className="text-ink3 line-through">{t('workedExampleOldDraft')}</span>
              </p>
              <p className="text-xs text-ink2">
                <span className="font-medium text-ink">{t('workedExampleYourEdit')}</span> {t('workedExampleEditDetail')}
              </p>
              <p className="text-[11px] text-ink3">
                {t('workedExampleReviewNote')}
              </p>
            </div>
          </Step>

          <button
            onClick={onStart}
            className="mt-1 w-full rounded-xl bg-accent text-white text-sm font-semibold py-2.5 hover:opacity-90"
          >
            {t('workedExampleGotIt')}
          </button>
        </div>
      )}
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-accent/15 text-accent text-[11px] font-bold flex items-center justify-center mt-0.5">
        {n}
      </span>
      <div className="flex-1 min-w-0 space-y-1.5">
        <p className="text-xs font-semibold text-ink">{title}</p>
        {children}
      </div>
    </div>
  );
}

function ExampleTag() {
  const { t } = useTranslation();
  return (
    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-panel border border-line text-ink3 uppercase tracking-wider">
      {t('workedExampleTag')}
    </span>
  );
}
