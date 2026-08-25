'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { isAuthenticated } from '@/lib/auth';
import { CONSUMER_PLANS } from '@/lib/plans';

type Audience = 'consumer' | 'centres';

// Consumer (B2C) — from the canonical USD source of truth (src/lib/plans.ts),
// one product (prod_UdpRpXbhmTnDHa). Display-only; the checkout key lives in
// /account/billing (which reads the same list).
const CONSUMER_TIERS = CONSUMER_PLANS.map((p) => ({
  name: p.name,
  price: p.priceMonthly,
  per: p.perMonth,
  annual: `or ${p.priceAnnual}/year (${p.annualSave})`,
  features: p.features,
  featured: p.featured,
}));

// Centre (B2B) — USD, per-class where noted. Human-close (pilot/demo CTAs).
const CENTRE_TIERS = [
  {
    name: 'Solo', badge: null, price: 'US$99', per: '/mo', annual: 'US$990/yr',
    unit: '1 teacher · 1 class', studentCap: 'Up to 15 students',
    cta: 'Request a demo', ctaHref: '/demo', pilotNote: 'Full access, no card required',
    featured: false,
  },
  {
    name: 'Centre', badge: 'Most popular', price: 'US$149', per: '/class/mo',
    annual: 'Volume: $129/class past 5 · annual default',
    unit: 'Per class · multi-teacher', studentCap: 'Up to 20 students/class',
    cta: 'Request a demo', ctaHref: '/demo', pilotNote: 'Full access on your real classes',
    featured: true,
  },
  {
    name: 'School', badge: 'Enterprise', price: 'Custom', per: '', annual: 'Annual contract',
    unit: 'Multiple campuses · dedicated support', studentCap: 'Custom class sizes',
    cta: 'Talk to sales', ctaHref: '/demo', pilotNote: 'SSO · signed DPA · invoice billing',
    featured: false,
  },
];

export default function PricingPage() {
  return (
    <Suspense fallback={null}>
      <PricingInner />
    </Suspense>
  );
}

function PricingInner() {
  const router = useRouter();
  const params = useSearchParams();
  const initial: Audience = params.get('for') === 'centres' ? 'centres' : 'consumer';
  const [audience, setAudience] = useState<Audience>(initial);

  function select(a: Audience) {
    setAudience(a);
    // Keep the URL shareable/deep-linkable without a full navigation.
    router.replace(`/pricing?for=${a}`, { scroll: false });
  }

  const consumerCta = (): string =>
    isAuthenticated() ? '/account/billing' : '/login?redirect=%2Faccount%2Fbilling';

  return (
    <div>
      {/* Nav — single "Pricing"; "For institutes" deep-links to the centre segment */}
      <nav className="mkt-nav">
        <div className="mkt-wrap mkt-nav-in">
          <Link className="mkt-brand" href="/">
            <span className="mkt-brand-chip">
              <Image src="/mochi-base-transparent.png" alt="" width={22} height={22} style={{ objectFit: 'contain' }} />
            </span>
            Apalchi
          </Link>
          <div className="mkt-nav-links">
            <Link href="/#how">How it works</Link>
            <Link href="/pricing">Pricing</Link>
          </div>
          <div className="mkt-nav-cta">
            <Link className="mkt-ghost" href="/login">Log in</Link>
            <Link className="mkt-btn mkt-btn-primary" href="/get-the-app">Get the app</Link>
          </div>
        </div>
      </nav>

      {/* Hero + audience selector */}
      <header className="mkt-hero" style={{ paddingBottom: 32, textAlign: 'center' }}>
        <div className="mkt-wrap" style={{ maxWidth: 720, margin: '0 auto' }}>
          <span className="mkt-eyebrow">
            <span className="mkt-eyebrow-dot" />
            Pricing
          </span>
          <h1 className="mkt-hero-h" style={{ textAlign: 'center' }}>Who is Apalchi for?</h1>
          <p className="mkt-sub" style={{ marginBottom: 20 }}>
            Pick the plans that fit you. A study partner that knows YOUR notes — for a learner, or your whole centre.
          </p>

          <AudienceToggle audience={audience} onSelect={select} />
        </div>
      </header>

      {/* Segment content */}
      <section className="mkt-band" style={{ paddingTop: 8 }}>
        <div className="mkt-wrap">
          <p className="mkt-kicker" style={{ textAlign: 'center' }}>
            {audience === 'consumer' ? 'For parents & students' : 'For education institutes'}
          </p>
          <h2 className="mkt-band-h" style={{ textAlign: 'center', marginBottom: 24 }}>
            {audience === 'consumer'
              ? 'A study partner that knows YOUR notes'
              : 'Your centre’s materials. Every student’s Mochi.'}
          </h2>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 20,
              alignItems: 'start',
            }}
          >
            {audience === 'consumer'
              ? CONSUMER_TIERS.map((t) => (
                  <ConsumerCard key={t.name} tier={t} ctaHref={consumerCta()} />
                ))
              : CENTRE_TIERS.map((t) => <CentreCard key={t.name} tier={t} />)}
          </div>

          <p style={{ textAlign: 'center', color: 'var(--t2)', fontSize: 13, fontWeight: 700, marginTop: 24 }}>
            {audience === 'consumer'
              ? 'Prices in USD — shown in your local currency at checkout. Cancel anytime from your billing settings.'
              : 'Prices in USD. Annual billing is default and saves ~17%. Monthly available on request.'}
          </p>

          {/* Cross-audience helper */}
          <p style={{ textAlign: 'center', color: 'var(--t3)', fontSize: 13, fontWeight: 700, marginTop: 12 }}>
            {audience === 'consumer' ? (
              <>Running an education institute?{' '}
                <button onClick={() => select('centres')} style={linkBtn}>See institute pricing →</button>
              </>
            ) : (
              <>Just for your own child?{' '}
                <button onClick={() => select('consumer')} style={linkBtn}>See parent &amp; student plans →</button>
              </>
            )}
          </p>
        </div>
      </section>

      {/* Centre-only value prop + pilot CTA (kept from the B2B page) */}
      {audience === 'centres' && (
        <>
          <section className="mkt-band" style={{ background: 'var(--surf2)' }}>
            <div className="mkt-wrap">
              <p className="mkt-kicker">Why centres choose Apalchi</p>
              <h2 className="mkt-band-h">Your centre&apos;s materials. Every student&apos;s Mochi.</h2>
              <div className="mkt-steps">
                <div className="mkt-step">
                  <div className="mkt-step-ic">📚</div>
                  <h3>Your notes. Your curriculum.</h3>
                  <p>Upload notes once. Every student gets 24/7 tutoring on exactly what you teach — not a generic textbook.</p>
                </div>
                <div className="mkt-step">
                  <div className="mkt-step-ic">📊</div>
                  <h3>Pre-class brief</h3>
                  <p>Walk in knowing which topics flopped and who needs help. Cut prep time in half.</p>
                </div>
                <div className="mkt-step">
                  <div className="mkt-step-ic">🚀</div>
                  <h3>30-day full pilot</h3>
                  <p>Run it on your real classes with full access. No card required. We make sure you&apos;re set up for success.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="mkt-final">
            <div className="mkt-wrap">
              <h2>Ready to try it on your real classes?</h2>
              <p>No card. No commitment. Just 30 days on your actual curriculum.</p>
              <Link className="mkt-btn mkt-btn-primary" href="/demo" style={{ padding: '15px 30px', fontSize: 17 }}>
                Start a 30-day pilot
              </Link>
              <p style={{ color: 'var(--t3)', fontSize: 13, fontWeight: 700, marginTop: 16 }}>
                School or MOE institution?{' '}
                <a href="mailto:hello@apalchi.com" style={{ color: 'var(--primary)', fontWeight: 800 }}>
                  Email us at hello@apalchi.com
                </a>
              </p>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

const linkBtn: React.CSSProperties = {
  background: 'none', border: 'none', padding: 0, cursor: 'pointer',
  color: 'var(--primary)', fontWeight: 800, fontSize: 13, fontFamily: 'inherit',
};

function AudienceToggle({ audience, onSelect }: { audience: Audience; onSelect: (a: Audience) => void }) {
  const opts: { key: Audience; label: string }[] = [
    { key: 'consumer', label: 'For parents & students' },
    { key: 'centres', label: 'For education institutes' },
  ];
  return (
    <div
      role="tablist"
      style={{
        display: 'inline-flex', gap: 4, padding: 4, borderRadius: 999,
        background: 'var(--surf2)', border: '1.5px solid var(--outline)',
      }}
    >
      {opts.map((o) => {
        const active = audience === o.key;
        return (
          <button
            key={o.key}
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(o.key)}
            style={{
              padding: '10px 18px', borderRadius: 999, border: 'none', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 14, fontWeight: 800,
              background: active ? 'var(--primary)' : 'transparent',
              color: active ? '#fff' : 'var(--t2)',
              transition: 'background .15s',
            }}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function ConsumerCard({ tier, ctaHref }: { tier: (typeof CONSUMER_TIERS)[number]; ctaHref: string }) {
  return (
    <div style={cardStyle(tier.featured, '#7042ED', '#8F66FA', 'rgba(112,66,237,0.45)')}>
      {tier.featured && <Badge featured>Most popular</Badge>}
      <TierName>{tier.name}</TierName>
      <PriceRow price={tier.price} per={tier.per} />
      <p style={{ fontSize: 12, opacity: 0.72, fontWeight: 700, marginBottom: 20 }}>{tier.annual}</p>
      <FeatureList featured={tier.featured}>
        {tier.features.map((f) => (
          <FeatureRow key={f} icon="✓" text={f} featured={tier.featured} />
        ))}
      </FeatureList>
      <Link href={ctaHref} style={ctaStyle(tier.featured)}>Choose {tier.name}</Link>
    </div>
  );
}

function CentreCard({ tier }: { tier: (typeof CENTRE_TIERS)[number] }) {
  return (
    <div style={cardStyle(tier.featured, '#4C6FFF', '#3A52D6', 'rgba(76,111,255,0.45)')}>
      {tier.badge && (
        <Badge featured={tier.featured} enterprise={tier.badge === 'Enterprise'}>{tier.badge}</Badge>
      )}
      <TierName>{tier.name}</TierName>
      <PriceRow price={tier.price} per={tier.per} />
      <p style={{ fontSize: 12, opacity: 0.72, fontWeight: 700, marginBottom: 20 }}>{tier.annual}</p>
      <FeatureList featured={tier.featured}>
        <FeatureRow icon="👥" text={tier.unit} featured={tier.featured} />
        <FeatureRow icon="🎓" text={tier.studentCap} featured={tier.featured} />
      </FeatureList>
      <Link href={tier.ctaHref} style={ctaStyle(tier.featured)}>{tier.cta}</Link>
      <p style={{ fontSize: 12, fontWeight: 700, opacity: 0.7, textAlign: 'center', marginTop: 10 }}>
        {tier.pilotNote}
      </p>
    </div>
  );
}

// ── Shared card primitives ────────────────────────────────────────────────
function cardStyle(featured: boolean, c1: string, c2: string, shadow: string): React.CSSProperties {
  return {
    background: featured ? `linear-gradient(140deg, ${c1}, ${c2})` : 'var(--surface)',
    border: featured ? 'none' : '1.5px solid var(--outline)',
    borderRadius: 24, padding: 28,
    color: featured ? '#fff' : 'var(--ink)',
    boxShadow: featured ? `0 20px 50px -18px ${shadow}` : '0 2px 10px rgba(0,0,0,0.04)',
    position: 'relative',
  };
}

function ctaStyle(featured: boolean): React.CSSProperties {
  return {
    display: 'block', textAlign: 'center', padding: '13px 0',
    background: featured ? '#fff' : 'var(--primary)',
    color: featured ? 'var(--primaryD)' : '#fff',
    borderRadius: 14, fontWeight: 800, fontSize: 15, textDecoration: 'none',
  };
}

function Badge({ children, featured, enterprise }: { children: React.ReactNode; featured?: boolean; enterprise?: boolean }) {
  return (
    <span
      style={{
        display: 'inline-block', fontSize: 11, fontWeight: 800, padding: '3px 10px',
        borderRadius: 999, marginBottom: 12,
        background: featured ? 'rgba(255,255,255,0.22)' : enterprise ? '#1F1733' : 'var(--primaryL)',
        color: featured ? '#fff' : enterprise ? '#fff' : 'var(--primaryD)',
        textTransform: 'uppercase', letterSpacing: '0.05em',
      }}
    >
      {children}
    </span>
  );
}

function TierName({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontFamily: 'var(--font-fredoka, Fredoka, sans-serif)', fontSize: 26, fontWeight: 600, marginBottom: 4 }}>
      {children}
    </h2>
  );
}

function PriceRow({ price, per }: { price: string; per: string }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <span style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.02em' }}>{price}</span>
      {per && <span style={{ fontSize: 15, fontWeight: 700, opacity: 0.75 }}>{per}</span>}
    </div>
  );
}

function FeatureList({ children, featured }: { children: React.ReactNode; featured: boolean }) {
  return (
    <div
      style={{
        borderTop: featured ? '1px solid rgba(255,255,255,0.18)' : '1px solid var(--outline)',
        paddingTop: 16, marginBottom: 20, display: 'flex', flexDirection: 'column', gap: 8,
      }}
    >
      {children}
    </div>
  );
}

function FeatureRow({ icon, text, featured }: { icon: string; text: string; featured: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 15 }}>{icon}</span>
      <span style={{ fontSize: 14, fontWeight: 700, opacity: featured ? 0.92 : 1 }}>{text}</span>
    </div>
  );
}
