/**
 * Single source of truth for how a subscription's server-authoritative status maps
 * to what the billing surface shows. Both /account and /account/billing derive their
 * plan display from this, so they can never drift (they used to each inline it, and
 * neither handled past_due / cancel-scheduled / canceled).
 *
 * Inputs come from GET /subscription/entitlement (isPremium, plan, trialEndsAt) and
 * GET /subscription/status (status, cancelAtPeriodEnd, currentPeriodEnd, canceledAt).
 * The raw `status` string can be free | trialing | active | past_due | canceled
 * (past_due/canceled are passed through from Stripe unmapped by the backend).
 */

export function formatDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export type PlanBadge = 'free' | 'trial' | 'active' | 'cancels' | 'past_due' | 'canceled';

export interface PlanState {
  badge: PlanBadge;
  title: string;              // heading, e.g. "Premium" / "Free trial" / "Free"
  detail: string | null;      // sub-line under the heading
  tone: 'normal' | 'warning'; // warning = needs user action (past_due)
  /** A LIVE Stripe subscription where the billing portal is the right action.
   *  Deliberately FALSE for canceled — a canceled user must see the plans and be
   *  able to resubscribe, never be trapped on a portal-only page (cf. the trial trap). */
  hasStripeBilling: boolean;
  onTrial: boolean;
  renewalDate: string | null;
  cta: { label: string; kind: 'manage' | 'subscribe' };
}

export interface PlanStateInput {
  isPremium: boolean;
  plan?: string | null;
  trialEndsAt?: string | null;
  status?: Record<string, unknown>;
}

export function derivePlanState(input: PlanStateInput): PlanState {
  const { isPremium, plan, trialEndsAt, status } = input;

  const subStatus = typeof status?.status === 'string' ? (status.status as string) : 'free';
  const isCanceled = subStatus === 'canceled';
  const isPastDue = subStatus === 'past_due';
  const cancelAtPeriodEnd = status?.cancelAtPeriodEnd === true;

  const hasStripeBilling = subStatus !== 'free' && !isCanceled;
  const onTrial = isPremium && !hasStripeBilling && !isCanceled;

  const renewalDate = formatDate(
    (status?.currentPeriodEnd as string | undefined) ??
      (status?.renewsAt as string | undefined) ??
      trialEndsAt,
  );
  const planName = plan && plan !== 'free' ? plan : 'Premium';

  // Priority: needs-action → ended → scheduled-cancel → active → trial → free.
  if (isPastDue) {
    // Backend revokes access immediately on past_due (not in ACTIVE_STATUSES → isPremium
    // is already false — no grace period), so say "restore", never "keep": the user has
    // already lost Premium and must fix payment to get it back.
    return {
      badge: 'past_due', title: planName,
      detail: 'Payment failed — update your payment method to restore Premium.',
      tone: 'warning', hasStripeBilling, onTrial: false, renewalDate,
      cta: { label: 'Update payment', kind: 'manage' },
    };
  }
  if (isCanceled) {
    return {
      badge: 'canceled', title: 'Free',
      detail: 'Your subscription has ended. Resubscribe anytime.',
      tone: 'normal', hasStripeBilling: false, onTrial: false, renewalDate,
      cta: { label: 'Resubscribe', kind: 'subscribe' },
    };
  }
  if (hasStripeBilling && cancelAtPeriodEnd) {
    return {
      badge: 'cancels', title: planName,
      detail: renewalDate
        ? `Premium — cancels on ${renewalDate}. Reactivate anytime.`
        : 'Premium — cancellation scheduled.',
      tone: 'normal', hasStripeBilling, onTrial: false, renewalDate,
      cta: { label: 'Manage billing', kind: 'manage' },
    };
  }
  if (hasStripeBilling) {
    return {
      badge: 'active', title: planName,
      detail: renewalDate ? `Renews ${renewalDate}` : null,
      tone: 'normal', hasStripeBilling, onTrial: false, renewalDate,
      cta: { label: 'Manage billing', kind: 'manage' },
    };
  }
  if (onTrial) {
    return {
      badge: 'trial', title: 'Free trial',
      detail: renewalDate
        ? `Free trial — subscribe to keep premium after ${renewalDate}.`
        : 'Free trial — subscribe to keep premium when it ends.',
      tone: 'normal', hasStripeBilling: false, onTrial: true, renewalDate,
      cta: { label: 'Subscribe', kind: 'subscribe' },
    };
  }
  return {
    badge: 'free', title: 'Free',
    detail: 'Upgrade to unlock the full LEARN → TEST → PROVE loop.',
    tone: 'normal', hasStripeBilling: false, onTrial: false, renewalDate,
    cta: { label: 'Upgrade', kind: 'subscribe' },
  };
}
