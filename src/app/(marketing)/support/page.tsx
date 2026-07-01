import Link from 'next/link';

export const metadata = {
  title: 'Support — Apalchi',
  description: 'Get help with Apalchi',
};

export default function SupportPage() {
  return (
    <div style={{ fontFamily: 'var(--font-nunito, Nunito, sans-serif)', background: '#fff', minHeight: '100vh' }}>
      {/* Header */}
      <header style={{ borderBottom: '1px solid #e5e7eb', padding: '16px 24px' }}>
        <div style={{ maxWidth: 768, margin: '0 auto' }}>
          <Link href="/" style={{ textDecoration: 'none', fontWeight: 800, fontSize: 20, color: '#1a1a2e' }}>
            Apalchi
          </Link>
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: 768, margin: '0 auto', padding: '48px 24px' }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: '#1a1a2e', marginBottom: 8 }}>
          Support
        </h1>
        <p style={{ color: '#6b7280', marginBottom: 48 }}>
          Need help with Apalchi? We&apos;re here for you. The fastest way to reach a human is email —{' '}
          <a href="mailto:hello@apalchi.com" style={linkStyle}>hello@apalchi.com</a>.
        </p>

        <Section title="Contact Us">
          <p>
            Email us at{' '}
            <a href="mailto:hello@apalchi.com" style={linkStyle}>hello@apalchi.com</a>{' '}
            and we&apos;ll help you out. We usually reply within 1–2 business days (Singapore time).
          </p>
          <p style={{ marginTop: 12 }}>
            Apalchi is operated by CATALYX SYSTEM PTE. LTD., registered in Singapore.
          </p>
        </Section>

        <Section title="Frequently Asked Questions">
          <h3 style={qStyle}>How do I create a Mochi study buddy?</h3>
          <p>
            Create a tutor and upload your own notes, worksheets, or photos. Apalchi compiles them into a
            personalised brain — your Mochi — that you can chat with, quiz yourself on, and revise from.
            The more you upload, the sharper it gets on your own material.
          </p>

          <h3 style={qStyle}>I&apos;m under 13 — why is my account restricted?</h3>
          <p>
            Apalchi requires parental consent for users under 13. A parent or guardian must approve your
            account via the consent email we send them before AI features unlock. See our{' '}
            <Link href="/privacy" style={linkStyle}>Privacy Policy</Link> for details on how parental
            consent is obtained and recorded.
          </p>

          <h3 style={qStyle}>How do I upgrade to Premium?</h3>
          <p>
            Premium is managed on the web at{' '}
            <a href="https://apalchi.com" style={linkStyle}>apalchi.com</a>. Sign in to your account to
            view plans and manage your billing.
          </p>

          <h3 style={qStyle}>How do I manage or cancel my subscription?</h3>
          <p>
            Sign in at{' '}
            <a href="https://apalchi.com" style={linkStyle}>apalchi.com</a>{' '}
            and open your account&apos;s billing settings to manage or cancel. Changes apply from your next
            billing cycle.
          </p>

          <h3 style={qStyle}>How do I delete my account or my data?</h3>
          <p>
            Email{' '}
            <a href="mailto:hello@apalchi.com" style={linkStyle}>hello@apalchi.com</a>{' '}
            to request deletion of your account and associated data, and we&apos;ll take care of it. See our{' '}
            <Link href="/privacy" style={linkStyle}>Privacy Policy</Link> for what data we hold and how it
            is handled.
          </p>

          <h3 style={qStyle}>The app isn&apos;t working / a lesson won&apos;t load — what do I do?</h3>
          <p>
            First, update to the latest version of the app and restart it — that clears up most issues. If
            it still doesn&apos;t work, email{' '}
            <a href="mailto:hello@apalchi.com" style={linkStyle}>hello@apalchi.com</a>{' '}
            with your device model and what you were doing when it happened, and we&apos;ll help you sort it
            out.
          </p>
        </Section>

        <Section title="Privacy &amp; Terms">
          <p>
            Read our{' '}
            <Link href="/privacy" style={linkStyle}>Privacy Policy</Link>{' '}
            and{' '}
            <Link href="/terms" style={linkStyle}>Terms of Service</Link>.
          </p>
        </Section>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #e5e7eb', padding: '24px', textAlign: 'center', color: '#6b7280', fontSize: 14 }}>
        <p>© 2026 Apalchi. All rights reserved.</p>
        <p style={{ marginTop: 8 }}>
          <Link href="/terms" style={linkStyle}>Terms of Service</Link>
          {' · '}
          <Link href="/privacy" style={linkStyle}>Privacy Policy</Link>
        </p>
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a2e', marginBottom: 12 }}>{title}</h2>
      <div style={{ color: '#374151', lineHeight: 1.7, fontSize: 16 }}>{children}</div>
    </section>
  );
}

const linkStyle: React.CSSProperties = { color: '#7042ED', textDecoration: 'underline' };
const qStyle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  color: '#1a1a2e',
  marginTop: 20,
  marginBottom: 4,
};
