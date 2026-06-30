'use client';

import Link from 'next/link';
import { isAuthenticated } from '@/lib/auth';

// Consumer (B2C) tiers. These mirror the PLANS in /account/billing — the page a
// CTA lands on (which then calls api.checkout with the backend plan key). Prices
// are display-only here; the actual checkout key lives in the billing page.
const CONSUMER_TIERS = [
  {
    name: 'Pro',
    price: 'S$8.90',
    per: '/month',
    annual: 'or S$89/year (save ~17%)',
    features: ['Unlimited chat with Mochi', 'Full LEARN → TEST → PROVE loop', 'Progress analytics'],
    featured: false,
  },
  {
    name: 'Max',
    price: 'S$14.90',
    per: '/month',
    annual: 'or S$149/year (save ~17%)',
    features: ['Everything in Pro', 'Group study', 'Priority AI speed'],
    featured: true,
  },
  {
    name: 'Family',
    price: 'S$24.90',
    per: '/month',
    annual: 'or S$249/year (save ~17%)',
    features: ['Up to 4 learners', 'Parent dashboard', 'Everything in Max'],
    featured: false,
  },
];

export default function ConsumerPlansPage() {
  // Unauthenticated learners go through login first, then bounce to billing.
  // /account/ is a SAFE_PREFIX, so the returnTo is honoured post-login.
  const ctaHref = (): string =>
    isAuthenticated()
      ? '/account/billing'
      : '/login?redirect=%2Faccount%2Fbilling';

  return (
    <div>
      {/* Nav — mirrors the B2B pricing page nav */}
      <nav className="mkt-nav">
        <div className="mkt-wrap mkt-nav-in">
          <Link className="mkt-brand" href="/">
            <span className="mkt-brand-chip">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/mochi-base-transparent.png" alt="" style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
            </span>
            Apalchi
          </Link>
          <div className="mkt-nav-links">
            <Link href="/#how">How it works</Link>
            <Link href="/plans">Plans</Link>
            <Link href="/pricing">For institutes</Link>
          </div>
          <div className="mkt-nav-cta">
            <Link className="mkt-ghost" href="/login">Log in</Link>
            <Link className="mkt-btn mkt-btn-primary" href="/get-the-app">
              Get the app
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="mkt-hero" style={{ paddingBottom: 48, textAlign: 'center' }}>
        <div className="mkt-wrap" style={{ maxWidth: 720, margin: '0 auto' }}>
          <span className="mkt-eyebrow">
            <span className="mkt-eyebrow-dot" />
            For learners
          </span>
          <h1 className="mkt-hero-h" style={{ textAlign: 'center' }}>
            Pick your Apalchi plan
          </h1>
          <p
            className="mkt-hl"
            style={{
              display: 'block',
              textAlign: 'center',
              fontSize: 'clamp(18px, 2.5vw, 26px)',
              fontWeight: 800,
              marginTop: 8,
              marginBottom: 16,
            }}
          >
            A study partner that knows YOUR notes
          </p>
          <p className="mkt-sub">
            Upload your own notes and let Mochi tutor you on exactly what you&apos;re studying. Cancel anytime.
          </p>
        </div>
      </header>

      {/* Plan cards */}
      <section className="mkt-band" style={{ paddingTop: 0 }}>
        <div className="mkt-wrap">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 20,
              alignItems: 'start',
            }}
          >
            {CONSUMER_TIERS.map((tier) => (
              <div
                key={tier.name}
                style={{
                  background: tier.featured ? 'linear-gradient(140deg, #7042ED, #8F66FA)' : 'var(--surface)',
                  border: tier.featured ? 'none' : '1.5px solid var(--outline)',
                  borderRadius: 24,
                  padding: 28,
                  color: tier.featured ? '#fff' : 'var(--ink)',
                  boxShadow: tier.featured ? '0 20px 50px -18px rgba(112,66,237,0.45)' : '0 2px 10px rgba(0,0,0,0.04)',
                  position: 'relative',
                }}
              >
                {tier.featured && (
                  <span
                    style={{
                      display: 'inline-block',
                      fontSize: 11,
                      fontWeight: 800,
                      padding: '3px 10px',
                      borderRadius: 999,
                      marginBottom: 12,
                      background: 'rgba(255,255,255,0.22)',
                      color: '#fff',
                      textTransform: 'uppercase' as const,
                      letterSpacing: '0.05em',
                    }}
                  >
                    Most popular
                  </span>
                )}

                <h2
                  style={{
                    fontFamily: 'var(--font-fredoka, Fredoka, sans-serif)',
                    fontSize: 26,
                    fontWeight: 600,
                    marginBottom: 4,
                  }}
                >
                  {tier.name}
                </h2>

                <div style={{ marginBottom: 6 }}>
                  <span style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.02em' }}>{tier.price}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, opacity: 0.75 }}>{tier.per}</span>
                </div>

                <p style={{ fontSize: 12, opacity: 0.72, fontWeight: 700, marginBottom: 20 }}>
                  {tier.annual}
                </p>

                <div
                  style={{
                    borderTop: tier.featured ? '1px solid rgba(255,255,255,0.18)' : '1px solid var(--outline)',
                    paddingTop: 16,
                    marginBottom: 20,
                    display: 'flex',
                    flexDirection: 'column' as const,
                    gap: 8,
                  }}
                >
                  {tier.features.map((f) => (
                    <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 15 }}>✓</span>
                      <span style={{ fontSize: 14, fontWeight: 700, opacity: tier.featured ? 0.92 : 1 }}>{f}</span>
                    </div>
                  ))}
                </div>

                <Link
                  href={ctaHref()}
                  style={{
                    display: 'block',
                    textAlign: 'center' as const,
                    padding: '13px 0',
                    background: tier.featured ? '#fff' : 'var(--primary)',
                    color: tier.featured ? 'var(--primaryD)' : '#fff',
                    borderRadius: 14,
                    fontWeight: 800,
                    fontSize: 15,
                    textDecoration: 'none',
                  }}
                >
                  Choose {tier.name}
                </Link>
              </div>
            ))}
          </div>

          <p
            style={{
              textAlign: 'center',
              color: 'var(--t2)',
              fontSize: 13,
              fontWeight: 700,
              marginTop: 24,
            }}
          >
            Prices in SGD. Cancel anytime from your billing settings.
          </p>
        </div>
      </section>
    </div>
  );
}
