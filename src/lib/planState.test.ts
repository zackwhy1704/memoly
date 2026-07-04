import { describe, it, expect } from 'vitest';
import { derivePlanState } from './planState';

// Pins the subscription states the billing surface must show. Before derivePlanState,
// both pages collapsed everything non-'free' to "Manage billing / Renews {date}", so a
// past-due, cancel-scheduled, or canceled sub was displayed WRONG. Each case below fails
// against that old behaviour and passes with the helper.
describe('derivePlanState', () => {
  it('past_due → warning tone, action CTA, no "Renews" line', () => {
    const s = derivePlanState({ isPremium: true, plan: 'Premium', status: { status: 'past_due', currentPeriodEnd: '2026-08-01' } });
    expect(s.badge).toBe('past_due');
    expect(s.tone).toBe('warning');
    expect(s.detail).toMatch(/payment failed/i);
    // Access is already revoked on past_due (backend gives no grace) — the copy must say
    // "restore", never "keep" (which would falsely imply the user still has access).
    expect(s.detail).toMatch(/restore/i);
    expect(s.detail).not.toMatch(/keep/i);
    expect(s.cta).toEqual({ label: 'Update payment', kind: 'manage' });
  });

  it('active + cancelAtPeriodEnd → "cancels on {date}", not "Renews"', () => {
    const s = derivePlanState({ isPremium: true, plan: 'Premium', status: { status: 'active', cancelAtPeriodEnd: true, currentPeriodEnd: '2026-08-01' } });
    expect(s.badge).toBe('cancels');
    expect(s.detail).toMatch(/cancels on/i);
    expect(s.detail).not.toMatch(/^Renews/);
  });

  it('canceled → NOT hasStripeBilling (so plans show, no portal-only trap) + Resubscribe CTA', () => {
    const s = derivePlanState({ isPremium: false, status: { status: 'canceled' } });
    expect(s.badge).toBe('canceled');
    expect(s.hasStripeBilling).toBe(false); // the anti-trap invariant
    expect(s.cta.kind).toBe('subscribe');
  });

  it('active (live sub) → "Renews {date}" + Manage billing', () => {
    const s = derivePlanState({ isPremium: true, plan: 'Premium', status: { status: 'active', cancelAtPeriodEnd: false, currentPeriodEnd: '2026-08-01' } });
    expect(s.badge).toBe('active');
    expect(s.hasStripeBilling).toBe(true);
    expect(s.detail).toMatch(/^Renews /);
    expect(s.cta).toEqual({ label: 'Manage billing', kind: 'manage' });
  });

  it('premium but no Stripe row → free trial', () => {
    const s = derivePlanState({ isPremium: true, plan: null, trialEndsAt: '2026-07-10', status: { status: 'free' } });
    expect(s.badge).toBe('trial');
    expect(s.onTrial).toBe(true);
    expect(s.cta.label).toBe('Subscribe');
  });

  it('no premium, no sub → free', () => {
    const s = derivePlanState({ isPremium: false, status: { status: 'free' } });
    expect(s.badge).toBe('free');
    expect(s.hasStripeBilling).toBe(false);
    expect(s.cta.label).toBe('Upgrade');
  });
});
