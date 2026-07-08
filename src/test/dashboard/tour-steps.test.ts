import { describe, it, expect } from 'vitest';
import { TOUR_STEPS, firstRunLandingTab, CLOSE_CTA_TAB } from '@/app/dashboard/classes/[classId]/tourSteps';
import { isTab } from '@/app/dashboard/classes/[classId]/sections';
import { STEPS as TEACH_STEPS } from '@/app/dashboard/classes/[classId]/teach/TeachStepper';

describe('tourSteps', () => {
  it('every step navigates to a valid Tab (or null) — a new/renamed tab cannot silently break the tour', () => {
    for (const step of TOUR_STEPS) {
      if (step.tab !== null) {
        expect(isTab(step.tab), `step "${step.id}" → tab "${step.tab}"`).toBe(true);
      }
    }
    expect(isTab(CLOSE_CTA_TAB)).toBe(true);
  });

  it('the Teach step narrates the stepper stages in TeachStepper order (reorder desync guard)', () => {
    const teach = TOUR_STEPS.find((s) => s.id === 'teach')!;
    const body = teach.body.toLowerCase();
    // Each stage's leading word appears, in the flow's defined order.
    const positions = TEACH_STEPS.map((s) => body.indexOf(s.label.split(' ')[0].toLowerCase()));
    expect(positions.every((p) => p >= 0), 'all stages mentioned').toBe(true);
    const sorted = [...positions].sort((a, b) => a - b);
    expect(positions, 'stages appear in stepper order').toEqual(sorted);
  });

  it('S8 (corrections) copy carries the decay-honesty phrasing (load-bearing)', () => {
    const s8 = TOUR_STEPS.find((s) => s.id === 'mark-corrections')!;
    expect(s8.body).toMatch(/future/i);
    expect(s8.body).toMatch(/won.t instantly un-learn/i);
  });

  it('firstRunLandingTab: empty brain + unseen + no deep-link → content; seen → null; deep-link → null', () => {
    expect(firstRunLandingTab({ brainIsEmpty: true, hasExplicitTab: false, tourSeen: false })).toBe('content');
    expect(firstRunLandingTab({ brainIsEmpty: true, hasExplicitTab: false, tourSeen: true })).toBeNull();
    expect(firstRunLandingTab({ brainIsEmpty: true, hasExplicitTab: true, tourSeen: false })).toBeNull();
    expect(firstRunLandingTab({ brainIsEmpty: false, hasExplicitTab: false, tourSeen: false })).toBeNull();
  });
});
