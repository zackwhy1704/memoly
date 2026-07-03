import { describe, it, expect } from 'vitest';
import {
  SECTIONS,
  SUBTAB_LABEL,
  sectionOf,
  isTab,
  type Tab,
} from '@/app/dashboard/classes/[classId]/sections';

/**
 * The 13 tab views regrouped into 4 sections. Guards the IA invariant: every old
 * tab key still resolves to exactly ONE section (so old ?tab= bookmarks land
 * correctly and no view is dropped or double-listed when the nav changes).
 */
describe('class detail information architecture', () => {
  const ALL_TABS = Object.keys(SUBTAB_LABEL) as Tab[];

  it('nav order is daily-jobs-first: Teach · Mark · Insights · Students', () => {
    expect(SECTIONS.map((s) => s.key)).toEqual(['teach', 'mark', 'insights', 'students']);
  });

  it('every one of the 13 tabs is in exactly one section (none dropped, none duplicated)', () => {
    const grouped = SECTIONS.flatMap((s) => s.subtabs);
    expect(grouped).toHaveLength(13);
    expect([...grouped].sort()).toEqual([...ALL_TABS].sort()); // same set
    expect(new Set(grouped).size).toBe(grouped.length); // no duplicates
  });

  it('resolves each old tab key to its section (old ?tab= deep links land right)', () => {
    const expected: Record<Tab, string> = {
      content: 'teach', modules: 'teach', assignments: 'teach', review: 'teach',
      submissions: 'mark',
      heatmap: 'insights', concepts: 'insights', readiness: 'insights',
      brief: 'insights', report: 'insights',
      roster: 'students', add: 'students', challenges: 'students',
    };
    for (const t of ALL_TABS) {
      expect(sectionOf(t)).toBe(expected[t]);
    }
  });

  it('every tab has a label', () => {
    for (const t of ALL_TABS) {
      expect(SUBTAB_LABEL[t]).toBeTruthy();
    }
  });

  it('isTab accepts the 13 keys and rejects junk', () => {
    expect(isTab('heatmap')).toBe(true);
    expect(isTab('content')).toBe(true);
    expect(isTab('nope')).toBe(false);
    expect(isTab(null)).toBe(false);
    expect(isTab(undefined)).toBe(false);
  });
});
