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

export interface TourStep {
  id: string;
  /** Tab to navigate to (via selectTab) BEFORE measuring the anchor; null = no
   *  navigation (centered card). */
  tab: Tab | null;
  /** data-tour attribute value to anchor the highlight ring to; null = centered
   *  card. Missing anchors also fall back to centered (see TourOverlay). */
  anchor: string | null;
  title: string;
  body: string;
  cta?: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    tab: null,
    anchor: null,
    title: 'Two loops run this class',
    body: 'Teach it, then mark it — Mochi helps with both, from your own material. '
      + 'Sixty seconds.',
    cta: 'Show me',
  },
  {
    id: 'teach',
    tab: 'content',
    anchor: 'teach-stepper',
    title: 'Teach: add material, build, assign',
    body: 'One guided flow: add your notes and worksheets, Mochi builds them into '
      + 'this class’s brain, then you preview the Learn → Test → Prove '
      + 'lessons it made from YOUR material and assign them. Students play in the '
      + 'Apalchi app.',
    cta: 'Next',
  },
  {
    id: 'insights-mastery',
    tab: 'concepts',
    anchor: 'subtab-concepts',
    title: 'Insights: what’s actually landing',
    body: 'As students work, their results flow back here as real signal — concept '
      + 'by concept, weakest first. It reflects graded work, not a guess.',
    cta: 'Next',
  },
  {
    id: 'insights-readiness',
    tab: 'readiness',
    anchor: 'subtab-readiness',
    title: 'Exam readiness, honestly',
    body: 'The weakest-first view for exam prep. A concept a student hasn’t been '
      + 'assessed on shows as “not assessed” — never a fake 0%.',
    cta: 'Next',
  },
  {
    id: 'mark-submissions',
    tab: 'submissions',
    anchor: 'nav-mark',
    title: 'Mark: an AI draft, your call',
    body: 'Add a marked paper or rubric, then generate an AI feedback draft. You '
      + 'edit it — and nothing reaches a student until YOU release it.',
    cta: 'Next',
  },
  {
    id: 'mark-corrections',
    tab: 'submissions',
    anchor: 'mark-corrections',
    title: 'It learns your marking standard',
    body: 'Your substantive edits are captured as corrections that shape future '
      + 'drafts toward how you mark. Remove one here and it stops shaping future '
      + 'drafts — it won’t instantly un-learn.',
    cta: 'Next',
  },
  {
    id: 'close',
    tab: null,
    anchor: null,
    title: 'That’s the loop',
    body: 'Teach it, mark it, and Mochi keeps both matched to your class. Replay '
      + 'this tour anytime from Settings.',
    cta: 'Upload your first file',
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
