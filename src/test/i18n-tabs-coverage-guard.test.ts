import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { scanFile } from './lib/jsx-string-scanner';

/**
 * i18n COVERAGE GUARD for `[classId]/tabs/` — mirrors pally's
 * `l10n_coverage_guard_test.dart` shrink-only-baseline discipline (no
 * @babel/parser dependency needed here: pally's own scan walks Dart source
 * text, not an AST, so a lightweight brace-depth text scan is the same
 * class of tool, not a downgrade).
 *
 * Walks every JSX text node in the tabs/ directory (using a brace-depth
 * counter to skip `{...}` expression content, so `{t('key')}` is correctly
 * NOT flagged) and fails on any literal English text that isn't in the
 * baseline below. The baseline is SHRINK-ONLY: translate a string and
 * delete its line; never add a line to silence a new hardcoded string
 * unless it is a deliberately-deferred, REASONED exception (see the
 * comments next to each baseline entry — this is the same "no bare
 * allow-list" discipline pally's guard enforces).
 */
const TABS_DIR = path.join(__dirname, '..', 'app', 'dashboard', 'classes', '[classId]', 'tabs');

// Baseline: `<file>::<text>` -> reason. Each entry is a DELIBERATE, reasoned
// deferral, not an oversight — see the PR description for the full
// reasoning on each category.
const BASELINE: Record<string, string> = {
  // GuidanceList's 5-item checklist (MarkingAssistantPanel) — idiomatic
  // phrasing, deferred to its own translation pass rather than rushed here.
  'MarkingAssistantPanel.tsx::✓ Marked exemplars teach the most — include your ticks, marks per line, and the final grade': 'deferred-checklist',
  'MarkingAssistantPanel.tsx::✓ State the grade you gave each exemplar (the AI anchors to it)': 'deferred-checklist',
  'MarkingAssistantPanel.tsx::✓ Upload 2–3 marked exemplars across grade bands (A, C, fail)': 'deferred-checklist',
  'MarkingAssistantPanel.tsx::✓ Include your rubric / mark scheme — a typed rubric beats a photo of one': 'deferred-checklist',
  'MarkingAssistantPanel.tsx::✓ The more you add, the closer AI drafts match your marking': 'deferred-checklist',
  // Teacher-instruction free-text DATA sent to the AI prompt assembler
  // (teacherPreferences) — a content_language-scoped decision, not UI
  // chrome; only the preset BUTTON LABELS are translated (see code comment
  // at TEACHING_PRESETS in ClassBrainTab.tsx).
  'ClassBrainTab.tsx::Use more worked examples.': 'content-not-chrome',
  'ClassBrainTab.tsx::Challenge students with harder questions.': 'content-not-chrome',
  'ClassBrainTab.tsx::Explain things as simply as possible.': 'content-not-chrome',
  'ClassBrainTab.tsx::Focus on exam-style questions and techniques.': 'content-not-chrome',
};

describe('[classId]/tabs i18n coverage guard', () => {
  it('every hardcoded English JSX text is translated, or a reasoned baseline entry', () => {
    const files = fs.readdirSync(TABS_DIR).filter((f) => f.endsWith('.tsx'));
    expect(files.length).toBeGreaterThan(0);

    const unexplained: string[] = [];
    for (const file of files) {
      const leaks = scanFile(path.join(TABS_DIR, file));
      for (const text of leaks) {
        const key = `${file}::${text}`;
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
