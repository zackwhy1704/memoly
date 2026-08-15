// Information architecture for the class detail view: the 13 tab views grouped
// into 4 job-based SECTIONS (daily jobs first, analytics third, setup last). The
// page renders sections as top nav + the active section's sub-tabs; each tab
// component's internals are unchanged. Pure + framework-free so it's unit-tested.
//
// Labels are MessageKeys, not strings — this file has no component context to
// call t() from, so resolution happens at render time in page.tsx.

import type { MessageKey } from '@/lib/messages/en';

export type Tab =
  | 'roster' | 'modules' | 'heatmap' | 'concepts' | 'content'
  | 'assignments' | 'submissions' | 'challenges' | 'review'
  | 'readiness' | 'brief' | 'report' | 'add' | 'classroom';

export type SectionKey = 'teach' | 'mark' | 'insights' | 'students';

export interface Section {
  key: SectionKey;
  labelKey: MessageKey;
  subtabs: Tab[];
}

// TEACH · MARK · INSIGHTS · STUDENTS. Review = ContentReviewPanel (content review,
// not marking) → TEACH; the Marking Assistant lives inside Submissions → MARK.
export const SECTIONS: Section[] = [
  { key: 'teach', labelKey: 'classIdSectionTeach', subtabs: ['content', 'modules', 'assignments', 'review'] },
  { key: 'mark', labelKey: 'classIdSectionMark', subtabs: ['submissions'] },
  { key: 'insights', labelKey: 'classIdSectionInsights', subtabs: ['heatmap', 'concepts', 'readiness', 'brief', 'report'] },
  { key: 'students', labelKey: 'classIdSectionStudents', subtabs: ['roster', 'add', 'challenges', 'classroom'] },
];

export const SUBTAB_LABEL_KEY: Record<Tab, MessageKey> = {
  roster: 'classIdSubtabRoster',
  modules: 'classIdSubtabModules',
  heatmap: 'classIdSubtabHeatmap',
  concepts: 'classIdSubtabConcepts',
  content: 'classIdSubtabBrain',
  assignments: 'classIdSubtabAssignments',
  submissions: 'classIdSubtabSubmissions',
  challenges: 'classIdSubtabChallenges',
  review: 'classIdSubtabReview',
  readiness: 'classIdSubtabReadiness',
  brief: 'classIdSubtabBrief',
  report: 'classIdSubtabReport',
  add: 'classIdSubtabAdd',
  classroom: 'classIdSubtabClassroom',
};

/** Landing tab when no ?tab= is present — preserves the prior default (roster). */
export const DEFAULT_TAB: Tab = 'roster';

const ALL_TABS = Object.keys(SUBTAB_LABEL_KEY) as Tab[];

/** Type guard for a raw ?tab= value (old bookmarks use the same 13 keys). */
export function isTab(s: string | null | undefined): s is Tab {
  return s != null && (ALL_TABS as string[]).includes(s);
}

/** The section that owns a given sub-tab (every tab belongs to exactly one). */
export function sectionOf(tab: Tab): SectionKey {
  const section = SECTIONS.find((s) => s.subtabs.includes(tab));
  return section ? section.key : 'teach';
}
