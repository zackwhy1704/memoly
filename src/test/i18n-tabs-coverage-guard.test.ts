import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

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

function stripExpressions(jsxLike: string): string {
  // Replace every top-level {...} JSX expression with a single space,
  // respecting nested braces, so text like {t('key')} or {a ? 'x' : 'y'}
  // never contributes literal text to the scan.
  let out = '';
  let depth = 0;
  for (const ch of jsxLike) {
    if (ch === '{') { depth++; continue; }
    if (ch === '}') { if (depth > 0) depth--; continue; }
    out += depth > 0 ? ' ' : ch;
  }
  return out;
}

// Extract only the JSX returned by each `return ( ... )` (paren-depth
// counted) in the file. Scoping to these blocks — rather than the whole
// file — is what keeps TS generics/comparisons (`Record<Kind, string>`,
// `a < b`) out of the scan: those live in plain TS code between JSX
// blocks, not inside them, and a whole-file `>...<` scan can't tell the
// two apart.
function extractJsxBlocks(src: string): string[] {
  const blocks: string[] = [];
  const re = /return\s*\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    const start = m.index + m[0].length;
    let depth = 1;
    let i = start;
    for (; i < src.length && depth > 0; i++) {
      if (src[i] === '(') depth++;
      else if (src[i] === ')') depth--;
    }
    blocks.push(src.slice(start, i - 1));
  }
  return blocks;
}

function isNoise(s: string): boolean {
  const t = s.trim();
  if (t.length === 0) return true;
  if (!/[A-Za-z]/.test(t)) return true; // no Latin letters — not an English leak
  if (/^[{}[\]().,:;/\\|<>=*_#%$@!?'"`~^&+-]+$/.test(t)) return true;
  if (/^&[a-zA-Z]+;$/.test(t)) return true; // HTML entity (e.g. &times;) — a glyph, not language text
  return false;
}

function scanFile(filePath: string): string[] {
  const src = fs.readFileSync(filePath, 'utf8');
  const leaks: string[] = [];
  for (const block of extractJsxBlocks(src)) {
    const stripped = stripExpressions(block);
    // JSX text is content between `>` and the next `<` in the ORIGINAL source
    // structure; scanning the brace-stripped version for the same shape keeps
    // line/column irrelevant and only cares about literal runs.
    const matches = stripped.match(/>([^<>{}]+)</g) ?? [];
    for (const mm of matches) {
      const text = mm.slice(1, -1);
      if (!isNoise(text)) leaks.push(text.trim());
    }
  }
  return leaks;
}

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
