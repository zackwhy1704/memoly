import { describe, it, expect } from 'vitest';
import { masteryPct } from '@/app/dashboard/classes/[classId]/tabs/ModulesTab';

/**
 * masteryPct is 0–100 from the backend. The helper must NOT ×100 (the 2600% bug),
 * must clamp, and must return null for absent data (so the UI shows "—", not "0%").
 */
describe('masteryPct scale', () => {
  it('passes a 0–100 value straight through (26 → 26, not 2600)', () => {
    expect(masteryPct(26)).toBe(26);
    expect(masteryPct(72.4)).toBe(72);
  });

  it('clamps >100 and <0', () => {
    expect(masteryPct(150)).toBe(100);
    expect(masteryPct(-5)).toBe(0);
  });

  it('null/undefined/NaN → null (renders "—")', () => {
    expect(masteryPct(null)).toBeNull();
    expect(masteryPct(undefined)).toBeNull();
    expect(masteryPct(NaN)).toBeNull();
  });
});
