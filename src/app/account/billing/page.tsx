'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import { getToken, logout } from '@/lib/auth';
import { CONSUMER_PLANS } from '@/lib/plans';
import { derivePlanState } from '@/lib/planState';

const PAYMENTS_UNAVAILABLE =
  "Payments aren't available right now. Please try again later or contact support.";

// Prices come from the canonical USD source of truth (src/lib/plans.ts) — the
// same list the marketing page + Stripe use. checkoutId is the EXACT plan key the
// backend's POST /subscription/checkout accepts (it rejects bare 'pro'/'max'/'family').
const PLANS = CONSUMER_PLANS.map((p) => ({
  id: p.id,
  checkoutId: p.checkoutId,
  name: p.name,
  price: `${p.priceMonthly} / month`,
  annual: `${p.priceAnnual} / year`,
  features: p.features,
}));

export default function BillingPage() {
  const router = useRouter();
  const [checkoutError, setCheckoutError] = useState('');
  const [portalError, setPortalError]     = useState('');

  const statusQuery = useQuery({
    queryKey: ['subscriptionStatus'],
    queryFn: () => api.subscriptionStatus(),
    enabled: !!getToken(),
  });

  const entitlementQuery = useQuery({
    queryKey: ['entitlement'],
    queryFn: () => api.entitlement(),
    enabled: !!getToken(),
  });

  const checkoutMut = useMutation({
    mutationFn: (plan: string) => api.checkout(plan),
    onSuccess: (res) => {
      // The backend may flag a non-live checkout via `mode`/`live`, and/or hand
      // back a placeholder `/mock-checkout` URL. Treat ANY of these as
      // "payments not available" rather than silently sending the user to a
      // dead/mock page. Keep all three checks: the field may not be deployed yet.
      const data = res.data as {
        checkoutUrl?: string;
        mode?: string;
        live?: boolean;
      };
      const url = data.checkoutUrl;
      const notLive =
        (data.mode !== undefined && data.mode !== 'live') ||
        data.live === false ||
        !url ||
        url.includes('/mock-checkout');
      if (notLive) {
        setCheckoutError(PAYMENTS_UNAVAILABLE);
        return;
      }
      window.location.href = url;
    },
    onError: (err) => {
      setCheckoutError(err instanceof ApiError ? err.userMessage : 'Could not start checkout.');
    },
  });

  const portalMut = useMutation({
    mutationFn: () => api.billingPortal(),
    onSuccess: (res) => {
      // Backend returns the portal URL under `url`; tolerate `portalUrl` too.
      const data = res.data as { url?: string; portalUrl?: string };
      const url = data.url ?? data.portalUrl;
      if (url) {
        window.location.href = url;
      } else {
        setPortalError('Could not open billing portal.');
      }
    },
    onError: (err) => {
      setPortalError(err instanceof ApiError ? err.userMessage : 'Could not open billing portal.');
    },
  });

  const status     = statusQuery.data?.data as Record<string, unknown> | undefined;
  const entitlement = entitlementQuery.data?.data as { isPremium?: boolean; plan?: string } | undefined;
  // `isPremium` is TRUE during the 7-day auto-trial — every new user is granted
  // premium server-side with NO Stripe customer. So it is the WRONG signal for
  // "can open the billing portal": a trial user has no Stripe customer and the
  // portal call 409s ("Subscribe first"). Gating the portal on isPremium is what
  // trapped trial users in a dead loop (portal-only, no way to subscribe).
  const isPremium  = !entitlementQuery.isError && (entitlement?.isPremium ?? false);

  // The ONLY trustworthy signal for a real, billable Stripe subscription is the
  // status row: getStatus() returns status:'free' (and plan:null) when there is
  // no subscription, and the actual Stripe status otherwise. A non-'free' status
  // means a subscription row exists → there is a Stripe customer → the portal
  // works. This is exactly what should gate "Manage billing".
  // Shared plan-state derivation (planState.ts) — adds past_due / cancel-scheduled /
  // canceled display, and crucially makes a CANCELED sub NOT count as hasStripeBilling
  // so the subscribe plans reappear: a canceled user must be able to resubscribe, never
  // be trapped on a portal-only page (the same class of bug as the trial trap).
  const planState = derivePlanState({
    isPremium,
    plan: entitlement?.plan ?? null,
    status,
  });
  const hasStripeBilling = planState.hasStripeBilling;
  const onTrial = planState.onTrial;
  const currentPlan = (status?.plan as string | undefined)
    ?? (onTrial ? 'Free trial' : 'free');

  // Logged-out users must not see a blank page. Redirect to sign in and come
  // straight back here afterwards (resolvePostLoginDest allows the /account/
  // prefix). Done in an effect so it runs after hydration, not during render.
  const isAuthed = !!getToken();
  useEffect(() => {
    if (!isAuthed) {
      router.replace('/login?redirect=/account/billing');
    }
  }, [isAuthed, router]);

  if (!isAuthed) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <p className="text-ink3 text-sm">Redirecting to sign in…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <Link
            href="/account"
            className="text-sm text-ink3 hover:text-ink font-semibold transition-colors"
          >
            ← Account
          </Link>
          <button
            onClick={logout}
            className="text-sm text-ink3 hover:text-ink font-semibold transition-colors"
          >
            Sign out
          </button>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-ink">Billing & Subscription</h1>
          <p className="text-ink3 text-sm mt-1">Manage your Apalchi plan.</p>
        </div>

        {/* Current plan */}
        <div className="bg-panel border border-line rounded-2xl p-6">
          <p className="text-xs font-semibold text-ink3 uppercase tracking-wide mb-1">Current plan</p>
          {statusQuery.isLoading ? (
            <p className="text-ink3 text-sm animate-pulse">Loading…</p>
          ) : (
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-lg font-bold text-ink capitalize">{planState.title}</p>
                {planState.detail && (
                  <p
                    className={`text-sm mt-0.5 ${
                      planState.tone === 'warning' ? 'text-bad font-semibold' : 'text-ink3'
                    }`}
                  >
                    {planState.detail}
                  </p>
                )}
              </div>
              {/* Portal is ONLY for users with a real Stripe subscription. A trial
                  user has no Stripe customer, so showing it here would 409 and
                  trap them. */}
              {hasStripeBilling && (
                <button
                  onClick={() => { setPortalError(''); portalMut.mutate(); }}
                  disabled={portalMut.isPending}
                  className="px-4 py-2 rounded-lg border border-line text-ink text-sm font-semibold hover:bg-panel2 transition-colors disabled:opacity-50"
                >
                  {portalMut.isPending ? 'Opening…' : 'Manage billing'}
                </button>
              )}
            </div>
          )}
          {portalError && <p className="mt-2 text-sm text-bad">{portalError}</p>}
        </div>

        {/* Subscribe / upgrade plans — shown whenever there is no real Stripe
            subscription (free OR trial), so a non-subscribed user always has a
            way forward and can never be stuck on a portal-only page. */}
        {!hasStripeBilling && (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-ink">
              {onTrial ? 'Subscribe to keep premium' : 'Upgrade to unlock more'}
            </p>
            {PLANS.map((plan) => {
              const isActive = currentPlan.toLowerCase() === plan.id;
              return (
                <div
                  key={plan.id}
                  className={`bg-panel border rounded-2xl p-5 flex items-start justify-between gap-4 ${
                    isActive ? 'border-accent' : 'border-line'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-ink">{plan.name}</p>
                      {isActive && (
                        <span className="text-xs font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                          Current
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-ink2 mb-0.5">{plan.price}</p>
                    <p className="text-xs text-ink3 mb-2">or {plan.annual} (save ~17%)</p>
                    <ul className="space-y-1">
                      {plan.features.map((f) => (
                        <li key={f} className="text-xs text-ink3 flex gap-1.5">
                          <span className="text-ok">✓</span> {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                  {!isActive && (
                    <button
                      onClick={() => {
                        setCheckoutError('');
                        checkoutMut.mutate(plan.checkoutId);
                      }}
                      disabled={checkoutMut.isPending}
                      className="shrink-0 px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent/80 transition-colors disabled:opacity-50"
                    >
                      {checkoutMut.isPending ? 'Loading…' : 'Upgrade'}
                    </button>
                  )}
                </div>
              );
            })}
            {checkoutError && <p className="text-sm text-bad">{checkoutError}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
