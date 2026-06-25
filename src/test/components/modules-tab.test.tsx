import { describe, it, expect } from 'vitest';
import { masteryPct } from '@/app/dashboard/classes/[classId]/tabs/ModulesTab';

// The bug: a fresh module returns avgMastery = null, and `Math.round(null * 100)`
// is NaN — which rendered as "NaN%" and an invalid `width: NaN%` (broken bar).
// masteryPct must collapse every non-finite input to null so the UI shows "—".
describe('masteryPct (Modules mastery guard)', () => {
  it('rounds a 0–1 mastery to an integer percent', () => {
    expect(masteryPct(0.726)).toBe(73);
    expect(masteryPct(0.4)).toBe(40);
    expect(masteryPct(1)).toBe(100);
    expect(masteryPct(0)).toBe(0); // genuine 0% (everyone failed) is preserved
  });

  it('returns null for null / undefined (fresh module, no attempts)', () => {
    expect(masteryPct(null)).toBeNull();
    expect(masteryPct(undefined)).toBeNull();
  });

  it('returns null for NaN / Infinity rather than propagating NaN%', () => {
    expect(masteryPct(NaN)).toBeNull();
    expect(masteryPct(Infinity)).toBeNull();
    expect(masteryPct(-Infinity)).toBeNull();
  });

  it('never returns NaN for any input (the invariant the bug violated)', () => {
    for (const v of [null, undefined, NaN, Infinity, 0, 0.5, 1]) {
      const pct = masteryPct(v as number | null | undefined);
      expect(pct === null || Number.isFinite(pct)).toBe(true);
    }
  });
});
