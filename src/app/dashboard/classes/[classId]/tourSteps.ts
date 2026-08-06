// Feature-tour step definitions — pure + framework-free (like sections.ts) so
// they're unit-tested and can't drift. The tour teaches the two loops that ARE
// the product: TEACH (upload → build → assign → insights) and MARK (draft →
// release → corrections). Every factual sentence here is backed by real
// behaviour; see the claim→evidence table in the PR.
//
// COPY HONESTY (load-bearing): corrections shape FUTURE drafts and never
// "instantly un-learn" (mirrors MarkingCorrections.tsx:22); teacher sign-off is
// required before feedback reaches a student; Insights reflect real graded work
// (NOT "every answer auto-graded"); Exam Readiness shows "not assessed", never a
// fake 0% (ModuleExamReadinessService trust-weighting).

import type { Tab } from './sections';
import type { MessageKey } from '@/lib/messages/en';

export interface TourStep {
  id: string;
  /** Tab to navigate to (via selectTab) BEFORE measuring the anchor; null = no
   *  navigation (centered card). */
  tab: Tab | null;
  /** data-tour attribute value to anchor the highlight ring to; null = centered
   *  card. Missing anchors also fall back to centered (see TourOverlay). */
  anchor: string | null;
  /** MessageKeys, not strings — this file has no component context to call
   *  t() from; TourOverlay resolves them at render time. */
  titleKey: MessageKey;
  bodyKey: MessageKey;
  ctaKey?: MessageKey;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    tab: null,
    anchor: null,
    titleKey: 'tourWelcomeTitle',
    bodyKey: 'tourWelcomeBody',
    ctaKey: 'tourWelcomeCta',
  },
  {
    id: 'teach',
    tab: 'content',
    anchor: 'teach-stepper',
    titleKey: 'tourTeachTitle',
    bodyKey: 'tourTeachBody',
    ctaKey: 'tourNext',
  },
  {
    id: 'insights-mastery',
    tab: 'concepts',
    anchor: 'subtab-concepts',
    titleKey: 'tourInsightsMasteryTitle',
    bodyKey: 'tourInsightsMasteryBody',
    ctaKey: 'tourNext',
  },
  {
    id: 'insights-readiness',
    tab: 'readiness',
    anchor: 'subtab-readiness',
    titleKey: 'tourInsightsReadinessTitle',
    bodyKey: 'tourInsightsReadinessBody',
    ctaKey: 'tourNext',
  },
  {
    id: 'mark-submissions',
    tab: 'submissions',
    anchor: 'nav-mark',
    titleKey: 'tourMarkSubmissionsTitle',
    bodyKey: 'tourMarkSubmissionsBody',
    ctaKey: 'tourNext',
  },
  {
    id: 'mark-corrections',
    tab: 'submissions',
    anchor: 'mark-corrections',
    titleKey: 'tourMarkCorrectionsTitle',
    bodyKey: 'tourMarkCorrectionsBody',
    ctaKey: 'tourNext',
  },
  {
    id: 'close',
    tab: null,
    anchor: null,
    titleKey: 'tourCloseTitle',
    bodyKey: 'tourCloseBody',
    ctaKey: 'tourCloseCta',
  },
];

/** Step the closing CTA lands on (Teach ▸ Brain). */
export const CLOSE_CTA_TAB: Tab = 'content';

/**
 * First-run landing tab (1.5): a first-time teacher with an empty brain lands on
 * Teach ▸ Brain so the tour's opening action meets the real uploader. A deep
 * link (?tab=) or a tour-seen teacher keeps the normal DEFAULT_TAB (roster) →
 * returns null (no override).
 */
export function firstRunLandingTab(o: {
  brainIsEmpty: boolean;
  hasExplicitTab: boolean;
  tourSeen: boolean;
}): Tab | null {
  if (o.tourSeen || o.hasExplicitTab) return null;
  return o.brainIsEmpty ? 'content' : null;
}
