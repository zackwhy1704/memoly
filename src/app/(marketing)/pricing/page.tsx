import Link from 'next/link';

export const metadata = {
  title: 'Pricing — Apalchi for Centres',
  description: 'AI study buddies trained on YOUR materials. Transparent pricing for tuition centres and schools.',
};

const TIERS = [
  {
    name: 'Solo',
    badge: null,
    price: '$99',
    pricePer: '/mo',
    annual: '$990/yr',
    unit: '1 teacher · 1 class',
    studentCap: 'Up to 15 students',
    cta: 'Start a 30-day pilot',
    ctaHref: '/signup',
    ctaExternal: false,
    pilotNote: 'Full access, no card required',
    featured: false,
  },
  {
    name: 'Centre',
    badge: 'Most popular',
    price: '$149',
    pricePer: '/class/mo',
    annual: 'Volume: $129/class past 5 · annual default',
    unit: 'Per class · multi-teacher',
    studentCap: 'Up to 20 students/class',
    cta: 'Start a 30-day pilot',
    ctaHref: '/signup',
    ctaExternal: false,
    pilotNote: 'Full access on your real classes',
    featured: true,
  },
  {
    name: 'School',
    badge: 'Enterprise',
    price: 'Custom',
    pricePer: '',
    annual: 'Annual contract',
    unit: 'Multiple campuses · dedicated support',
    studentCap: 'Custom class sizes',
    cta: 'Talk to sales',
    ctaHref: '/demo',
    ctaExternal: false,
    pilotNote: 'SSO · signed DPA · invoice billing',
    featured: false,
  },
];

export default function PricingPage() {
  return (
    <div>
      {/* Nav */}
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
            <a href="/#how">How it works</a>
            <a href="/#centres">For institutes</a>
            <a href="/pricing">Pricing</a>
          </div>
          <div className="mkt-nav-cta">
            <Link className="mkt-ghost" href="/login">Log in</Link>
            <a href="/demo" style={{ fontSize: 13, color: 'var(--t2)', fontWeight: 600, textDecoration: 'none' }}>Demo</a>
            <Link className="mkt-btn mkt-btn-primary" href="/signup">
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <header className="mkt-hero" style={{ paddingBottom: 48, textAlign: 'center' }}>
        <div className="mkt-wrap" style={{ maxWidth: 720, margin: '0 auto' }}>
          <span className="mkt-eyebrow">
            <span className="mkt-eyebrow-dot" />
            B2B Pricing
          </span>
          <h1 className="mkt-hero-h" style={{ textAlign: 'center' }}>
            Apalchi for Centres
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
            AI study buddies trained on YOUR materials
          </p>
          <p className="mkt-sub">
            Not a generic question bank. Every student gets Mochi tutoring them on exactly what your centre teaches.
          </p>
        </div>
      </header>

      {/* Pricing cards */}
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
            {TIERS.map((tier) => (
              <div
                key={tier.name}
                style={{
                  background: tier.featured ? 'linear-gradient(140deg, #4C6FFF, #3A52D6)' : 'var(--surface)',
                  border: tier.featured ? 'none' : '1.5px solid var(--outline)',
                  borderRadius: 24,
                  padding: 28,
                  color: tier.featured ? '#fff' : 'var(--ink)',
                  boxShadow: tier.featured ? '0 20px 50px -18px rgba(76,111,255,0.45)' : '0 2px 10px rgba(0,0,0,0.04)',
                  position: 'relative',
                }}
              >
                {/* Badge */}
                {tier.badge && (
                  <span
                    style={{
                      display: 'inline-block',
                      fontSize: 11,
                      fontWeight: 800,
                      padding: '3px 10px',
                      borderRadius: 999,
                      marginBottom: 12,
                      background: tier.featured ? 'rgba(255,255,255,0.22)' : tier.badge === 'Enterprise' ? '#2A2118' : 'var(--primaryL)',
                      color: tier.featured ? '#fff' : tier.badge === 'Enterprise' ? '#fff' : 'var(--primaryD)',
                      textTransform: 'uppercase' as const,
                      letterSpacing: '0.05em',
                    }}
                  >
                    {tier.badge}
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

                {/* Price */}
                <div style={{ marginBottom: 6 }}>
                  <span style={{ fontSize: 36, fontWeight: 800, letterSpacing: '-0.02em' }}>{tier.price}</span>
                  {tier.pricePer && (
                    <span style={{ fontSize: 15, fontWeight: 700, opacity: 0.75 }}>{tier.pricePer}</span>
                  )}
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
                  <FeatureRow icon="👥" text={tier.unit} featured={tier.featured} />
                  <FeatureRow icon="🎓" text={tier.studentCap} featured={tier.featured} />
                </div>

                {/* CTA */}
                {tier.ctaExternal ? (
                  <a
                    href={tier.ctaHref}
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
                      marginBottom: 10,
                    }}
                  >
                    {tier.cta}
                  </a>
                ) : (
                  <Link
                    href={tier.ctaHref}
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
                      marginBottom: 10,
                    }}
                  >
                    {tier.cta}
                  </Link>
                )}

                <p
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    opacity: 0.7,
                    textAlign: 'center' as const,
                  }}
                >
                  {tier.pilotNote}
                </p>
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
            Annual billing is default and saves ~17%. Monthly available on request.
          </p>
        </div>
      </section>

      {/* Value prop section */}
      <section className="mkt-band" style={{ background: 'var(--surf2)' }}>
        <div className="mkt-wrap">
          <p className="mkt-kicker">Why centres choose Apalchi</p>
          <h2 className="mkt-band-h">Your centre&apos;s materials. Every student&apos;s Mochi.</h2>

          <div className="mkt-steps">
            <div className="mkt-step">
              <div className="mkt-step-ic">📚</div>
              <h3>Your notes. Your curriculum.</h3>
              <p>
                Upload notes once. Every student gets 24/7 tutoring on exactly what you teach — not a generic textbook.
              </p>
            </div>
            <div className="mkt-step">
              <div className="mkt-step-ic">📊</div>
              <h3>Pre-class brief</h3>
              <p>
                Walk in knowing which topics flopped and who needs help. Cut prep time in half.
              </p>
            </div>
            <div className="mkt-step">
              <div className="mkt-step-ic">🚀</div>
              <h3>30-day full pilot</h3>
              <p>
                Run it on your real classes with full access. No card required. We make sure you&apos;re set up for success.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mkt-final">
        <div className="mkt-wrap">
          <h2>Ready to try it on your real classes?</h2>
          <p>No card. No commitment. Just 30 days on your actual curriculum.</p>
          <Link
            className="mkt-btn mkt-btn-primary"
            href="/demo"
            style={{ padding: '15px 30px', fontSize: 17 }}
          >
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
