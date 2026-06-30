'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { getToken, logout } from '@/lib/auth';

// Store URLs — the "Continue in the app" nudge reuses the same env vars as the
// public /get-the-app page. When unset, the badges read "soon" and are inert.
const IOS_STORE = process.env.NEXT_PUBLIC_IOS_URL || null;
const ANDROID_STORE = process.env.NEXT_PUBLIC_ANDROID_URL || null;

/**
 * Consumer Account hub (AUTH REQUIRED).
 *
 * The four-door post-login model lands plain consumers here — a real account +
 * billing control plane, NOT a "download the app" wall. The native app stays the
 * product; the web reads server-authoritative entitlement and routes to checkout.
 *
 * Centre staff / admins are routed elsewhere by resolvePostLoginDest and never
 * land here.
 */
export default function AccountPage() {
  const router = useRouter();
  const isAuthed = !!getToken();

  // Run the redirect after hydration so it doesn't fire during render.
  useEffect(() => {
    if (!isAuthed) {
      router.replace('/login?redirect=/account');
    }
  }, [isAuthed, router]);

  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: () => api.getMe(),
    enabled: isAuthed,
  });

  const entitlementQuery = useQuery({
    queryKey: ['entitlement'],
    queryFn: () => api.entitlement(),
    enabled: isAuthed,
  });

  const statusQuery = useQuery({
    queryKey: ['subscriptionStatus'],
    queryFn: () => api.subscriptionStatus(),
    enabled: isAuthed,
  });

  if (!isAuthed) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <p className="text-ink3 text-sm">Redirecting to sign in…</p>
      </div>
    );
  }

  const me = meQuery.data?.data;
  const displayName = me?.displayName || 'Your account';
  const email = me?.email ?? '';

  // Fail-closed: if entitlement fails to load, treat the user as FREE. We never
  // assume premium on an error.
  const entitlement = entitlementQuery.data?.data;
  const isPremium = entitlement?.isPremium === true;
  const planName = entitlement?.plan ?? null;

  // subscriptionStatus is an opaque record; pull a renewal date defensively if
  // the backend exposes one. Omit the line entirely when absent.
  const status = statusQuery.data?.data as Record<string, unknown> | undefined;
  const renewalRaw =
    (status?.renewsAt as string | undefined) ??
    (status?.currentPeriodEnd as string | undefined) ??
    (entitlement?.trialEndsAt ?? undefined);
  const renewalDate = formatDate(renewalRaw);

  return (
    <div className="min-h-screen bg-bg py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-ink">Account</h1>
          <p className="text-ink3 text-sm mt-1">Manage your Apalchi account and plan.</p>
        </div>

        {/* Identity */}
        <div className="bg-panel border border-line rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-ink3 uppercase tracking-wide mb-1">
                Signed in as
              </p>
              {meQuery.isLoading ? (
                <p className="text-ink3 text-sm animate-pulse">Loading…</p>
              ) : (
                <>
                  <p className="text-lg font-bold text-ink truncate">{displayName}</p>
                  {email && <p className="text-sm text-ink3 truncate">{email}</p>}
                </>
              )}
            </div>
            <button
              onClick={logout}
              className="shrink-0 px-4 py-2 rounded-lg border border-line text-ink text-sm font-semibold hover:bg-panel2 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>

        {/* Plan */}
        <div className="bg-panel border border-line rounded-2xl p-6">
          <p className="text-xs font-semibold text-ink3 uppercase tracking-wide mb-1">
            Current plan
          </p>
          {entitlementQuery.isLoading ? (
            <p className="text-ink3 text-sm animate-pulse">Loading…</p>
          ) : (
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="min-w-0">
                <p className="text-lg font-bold text-ink capitalize">
                  {isPremium ? planName || 'Premium' : 'Free'}
                </p>
                {isPremium && renewalDate && (
                  <p className="text-sm text-ink3 mt-0.5">Renews {renewalDate}</p>
                )}
                {!isPremium && (
                  <p className="text-sm text-ink3 mt-0.5">
                    Upgrade to unlock the full LEARN → TEST → PROVE loop.
                  </p>
                )}
              </div>
              <Link
                href="/account/billing"
                className={`shrink-0 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  isPremium
                    ? 'border border-line text-ink hover:bg-panel2'
                    : 'bg-accent text-white hover:bg-accent/80'
                }`}
              >
                {isPremium ? 'Manage billing' : 'Upgrade'}
              </Link>
            </div>
          )}
        </div>

        {/* Continue in the app — an OPTION, never a redirect */}
        <div className="bg-panel border border-line rounded-2xl p-6">
          <p className="text-xs font-semibold text-ink3 uppercase tracking-wide mb-1">
            Continue in the app
          </p>
          <p className="text-sm text-ink2 mb-4">
            Studying happens in the Apalchi app. Grab it for your phone — your plan
            comes with you.
          </p>
          <div className="flex gap-3 flex-wrap">
            <StoreBadge href={IOS_STORE} label="Download on the" store="App Store" icon="🍎" />
            <StoreBadge href={ANDROID_STORE} label="Get it on" store="Google Play" icon="▶" />
          </div>
        </div>
      </div>
    </div>
  );
}

function formatDate(raw: string | undefined): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function StoreBadge({
  href,
  label,
  store,
  icon,
}: {
  href: string | null;
  label: string;
  store: string;
  icon: string;
}) {
  if (!href) {
    return (
      <span className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl bg-panel2 text-ink3 opacity-70 cursor-default">
        <span className="text-xl">{icon}</span>
        <span className="leading-tight">
          <span className="block text-[10px] font-normal">{label}</span>
          <span className="block text-sm font-bold">{store} — soon</span>
        </span>
      </span>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl bg-ink text-bg hover:opacity-90 transition-opacity"
    >
      <span className="text-xl">{icon}</span>
      <span className="leading-tight">
        <span className="block text-[10px] font-normal opacity-70">{label}</span>
        <span className="block text-sm font-bold">{store}</span>
      </span>
    </a>
  );
}
