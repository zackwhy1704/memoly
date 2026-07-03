import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';

/**
 * A static-src image (`<img src="/..."` or `"https://...">`) must use next/image
 * for lazy-load + WebP + CLS prevention. Two exemptions:
 *   - dynamic src={...} (signed/arbitrary submission & module URLs) — never matched;
 *   - a static <img> explicitly marked `next-image-exempt: <reason>` in a nearby
 *     comment (ref-driven animation, fill+filter recolor overlay, or SVG layer that
 *     next/image would complicate). Each such tag must carry a justification.
 * This guard fails if a NEW un-exempt static <img> is added — the mascot regression
 * this phase fixed (and which was under-counted by single-line grep).
 */
function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

describe('no raw static <img>', () => {
  it('every static-src image uses next/image (dynamic + marked-exempt allowed)', () => {
    const offenders: string[] = [];
    for (const file of walk('src')) {
      if (!/\.(tsx|jsx)$/.test(file)) continue;
      if (file.includes('/test/') || /\.test\./.test(file)) continue; // skip this guard itself
      const src = readFileSync(file, 'utf8');
      // Find each static-src <img> and require an exemption marker within the
      // preceding ~240 chars (covers the multi-line tag + its comment).
      const re = /<img\s+[^>]*src="/g;
      let m: RegExpExecArray | null;
      while ((m = re.exec(src)) !== null) {
        const before = src.slice(Math.max(0, m.index - 400), m.index);
        if (!before.includes('next-image-exempt')) {
          offenders.push(`${file} @${src.slice(0, m.index).split('\n').length}`);
        }
      }
    }
    expect(offenders, `un-exempt raw static <img> found — use next/image or justify with next-image-exempt:\n${offenders.join('\n')}`)
      .toEqual([]);
  });
});
