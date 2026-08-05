import fs from 'node:fs';

/**
 * Dependency-free JSX hardcoded-string scanner, shared by the per-surface
 * i18n coverage guards (mirrors pally's `l10n_coverage_guard_test.dart`
 * shrink-only-baseline discipline). Originally written inline in
 * i18n-tabs-coverage-guard.test.ts; extracted here so the roster-pages
 * guard doesn't duplicate the same ~40 lines.
 */

export function stripExpressions(jsxLike: string): string {
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
export function extractJsxBlocks(src: string): string[] {
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

export function isNoise(s: string): boolean {
  const t = s.trim();
  if (t.length === 0) return true;
  if (!/[A-Za-z]/.test(t)) return true; // no Latin letters — not an English leak
  if (/^[{}[\]().,:;/\\|<>=*_#%$@!?'"`~^&+-]+$/.test(t)) return true;
  if (/^&[a-zA-Z]+;$/.test(t)) return true; // HTML entity (e.g. &times;) — a glyph, not language text
  return false;
}

export function scanFile(filePath: string): string[] {
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
