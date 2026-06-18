'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';

const PLANS = [
  {
    id: 'pro',
    name: 'Pro',
    price: 'S$6.90 / month',
    features: ['Unlimited chat', 'Full LEARN→TEST→PROVE loop', 'Basic analytics'],
  },
  {
    id: 'max',
    name: 'Max',
    price: 'S$12.90 / month',
    features: ['Everything in Pro', 'Group study', 'Priority AI speed'],
  },
  {
    id: 'family',
    name: 'Family',
    price: 'S$19.90 / month',
    features: ['Up to 4 learners', 'Parent dashboard', 'Everything in Max'],
  },
];

export default function BillingPage() {
  const router = useRouter();
  const [checkoutError, setCheckoutError] = useState('');
  const [portalError, setPortalError]     = useState('');

  useEffect(() => {
    if (!getToken()) {
      router.replace('/login?redirect=/account/billing');
    }
  }, [router]);

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
      const url = (res.data as { checkoutUrl?: string }).checkoutUrl;
      if (url) window.location.href = url;
    },
    onError: (err) => {
      setCheckoutError(err instanceof ApiError ? err.userMessage : 'Could not start checkout.');
    },
  });

  const portalMut = useMutation({
    mutationFn: () => api.billingPortal(),
    onSuccess: (res) => {
      const url = (res.data as { portalUrl?: string }).portalUrl;
      if (url) window.location.href = url;
    },
    onError: (err) => {
      setPortalError(err instanceof ApiError ? err.userMessage : 'Could not open billing portal.');
    },
  });

  const status     = statusQuery.data?.data as Record<string, unknown> | undefined;
  const entitlement = entitlementQuery.data?.data as { isPremium?: boolean; plan?: string } | undefined;
  const isPremium  = entitlement?.isPremium ?? false;
  const currentPlan = (status?.plan as string | undefined) ?? 'free';

  if (!getToken()) return null;

  return (
    <div className="min-h-screen bg-bg py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
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
                <p className="text-lg font-bold text-ink capitalize">{currentPlan}</p>
                    </div>
              {isPremium && (
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

        {/* Upgrade plans — shown to all non-premium users */}
        {!isPremium && (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-ink">
              {isPremium ? 'Change plan' : 'Upgrade to unlock more'}
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
                    <p className="text-sm text-ink2 mb-2">{plan.price}</p>
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
                        checkoutMut.mutate(plan.id);
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
