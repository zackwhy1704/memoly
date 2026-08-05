import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { scanFile } from './lib/jsx-string-scanner';

/**
 * i18n COVERAGE GUARD for the roster pages (PR3): the org-wide student
 * roster (`dashboard/students/page.tsx`, named `roster` by its own
 * `api.roster`/`['roster', ...]` query key), the per-student detail page
 * (`dashboard/students/[studentId]/page.tsx`), and the staff roster
 * (`dashboard/teachers/page.tsx`). Same shrink-only-baseline discipline as
 * i18n-tabs-coverage-guard.test.ts (shared scanner in ./lib/jsx-string-scanner).
 */
const ROSTER_FILES: Array<{ label: string; filePath: string }> = [
  { label: 'students/page.tsx', filePath: path.join(__dirname, '..', 'app', 'dashboard', 'students', 'page.tsx') },
  { label: 'students/[studentId]/page.tsx', filePath: path.join(__dirname, '..', 'app', 'dashboard', 'students', '[studentId]', 'page.tsx') },
  { label: 'teachers/page.tsx', filePath: path.join(__dirname, '..', 'app', 'dashboard', 'teachers', 'page.tsx') },
];

// Baseline: `<file>::<text>` -> reason. Each entry is a DELIBERATE, reasoned
// deferral, not an oversight. Empty here — the roster pages have no
// deferred strings (unlike [classId]/tabs' checklist/TEACHING_PRESETS
// carve-outs); every hardcoded string in these 3 files is now translated.
const BASELINE: Record<string, string> = {};

describe('roster pages (students/students-detail/teachers) i18n coverage guard', () => {
  it('every hardcoded English JSX text is translated, or a reasoned baseline entry', () => {
    const unexplained: string[] = [];
    for (const { label, filePath } of ROSTER_FILES) {
      const leaks = scanFile(filePath);
      for (const text of leaks) {
        const key = `${label}::${text}`;
        if (!(key in BASELINE)) unexplained.push(key);
      }
    }

    expect(unexplained, `Untranslated (or unbaselined) strings found:\n${unexplained.join('\n')}`).toEqual([]);
  });

  it('every baseline entry has a reason (no bare allow — this is the guard\'s teeth)', () => {
    const unreasoned = Object.entries(BASELINE).filter(([, reason]) => !reason || reason.trim() === '');
    expect(unreasoned).toEqual([]);
  });
});
