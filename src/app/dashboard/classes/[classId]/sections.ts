// Information architecture for the class detail view: the 13 tab views grouped
// into 4 job-based SECTIONS (daily jobs first, analytics third, setup last). The
// page renders sections as top nav + the active section's sub-tabs; each tab
// component's internals are unchanged. Pure + framework-free so it's unit-tested.

export type Tab =
  | 'roster' | 'modules' | 'heatmap' | 'concepts' | 'content'
  | 'assignments' | 'submissions' | 'challenges' | 'review'
  | 'readiness' | 'brief' | 'report' | 'add';

export type SectionKey = 'teach' | 'mark' | 'insights' | 'students';

export interface Section {
  key: SectionKey;
  label: string;
  subtabs: Tab[];
}

// TEACH · MARK · INSIGHTS · STUDENTS. Review = ContentReviewPanel (content review,
// not marking) → TEACH; the Marking Assistant lives inside Submissions → MARK.
export const SECTIONS: Section[] = [
  { key: 'teach', label: 'Teach', subtabs: ['content', 'modules', 'assignments', 'review'] },
  { key: 'mark', label: 'Mark', subtabs: ['submissions'] },
  { key: 'insights', label: 'Insights', subtabs: ['heatmap', 'concepts', 'readiness', 'brief', 'report'] },
  { key: 'students', label: 'Students', subtabs: ['roster', 'add', 'challenges'] },
];

export const SUBTAB_LABEL: Record<Tab, string> = {
  roster: 'Roster',
  modules: 'Modules',
  heatmap: 'Heatmap',
  concepts: 'Concept Mastery',
  content: 'Brain',
  assignments: 'Assignments',
  submissions: 'Submissions',
  challenges: 'Challenges',
  review: 'Review',
  readiness: 'Exam Readiness',
  brief: 'Class Brief',
  report: 'AI Report',
  add: 'Add students',
};

/** Landing tab when no ?tab= is present — preserves the prior default (roster). */
export const DEFAULT_TAB: Tab = 'roster';

const ALL_TABS = Object.keys(SUBTAB_LABEL) as Tab[];

/** Type guard for a raw ?tab= value (old bookmarks use the same 13 keys). */
export function isTab(s: string | null | undefined): s is Tab {
  return s != null && (ALL_TABS as string[]).includes(s);
}

/** The section that owns a given sub-tab (every tab belongs to exactly one). */
export function sectionOf(tab: Tab): SectionKey {
  const section = SECTIONS.find((s) => s.subtabs.includes(tab));
  return section ? section.key : 'teach';
}
