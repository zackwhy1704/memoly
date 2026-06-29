import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy — Apalchi',
  description: 'Apalchi Privacy Policy',
};

export default function PrivacyPage() {
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
          Privacy Policy
        </h1>
        <p style={{ color: '#6b7280', marginBottom: 48 }}>Last updated: June 2026</p>

        <Section title="1. Who We Are">
          <p>
            Apalchi is operated by Apalchi Pte. Ltd., registered in Singapore. We build AI-powered
            study tools for students and tuition centres. For privacy enquiries, contact us at{' '}
            <a href="mailto:privacy@apalchi.com" style={linkStyle}>privacy@apalchi.com</a>.
          </p>
        </Section>

        <Section title="2. What Data We Collect">
          <p>We collect the following categories of data:</p>
          <ul style={listStyle}>
            <li>
              <strong>Account data</strong> — name, email address, and password hash when you sign up.
            </li>
            <li>
              <strong>Content you upload</strong> — notes, worksheets, and images you submit to the
              platform for AI processing.
            </li>
            <li>
              <strong>Usage data</strong> — pages visited, features used, session duration, and in-app
              actions, collected via PostHog analytics.
            </li>
            <li>
              <strong>Device data</strong> — device type, operating system version, and app version,
              collected automatically for crash reporting and compatibility.
            </li>
            <li>
              <strong>Payment data</strong> — billing is handled by Stripe (web) or the App Store /
              Google Play. We do not store card numbers.
            </li>
          </ul>
        </Section>

        <Section title="3. How We Use Your Data">
          <p>We use your data to:</p>
          <ul style={listStyle}>
            <li>Provide and personalise the Apalchi learning experience</li>
            <li>Process and respond to your uploaded notes via AI</li>
            <li>Communicate service updates, billing notices, and support replies</li>
            <li>Analyse usage patterns to improve the product</li>
            <li>Detect and prevent fraud or abuse</li>
          </ul>
          <p style={{ marginTop: 12 }}>
            We do not sell your personal data. We do not use your content to train AI models.
          </p>
        </Section>

        <Section title="4. AI Processing">
          <p>
            Uploaded notes and typed questions are sent to third-party AI providers (Anthropic Claude,
            Google Gemini) to generate educational content. These providers process data under their own
            data processing agreements and are bound by contractual obligations to keep your data
            confidential and not use it for training.
          </p>
        </Section>

        <Section title="5. Data Sharing">
          <p>We share data only with:</p>
          <ul style={listStyle}>
            <li>
              <strong>AI providers</strong> — Anthropic, Google — for content generation (see Section 4)
            </li>
            <li>
              <strong>Analytics</strong> — PostHog, for product analytics (pseudonymous)
            </li>
            <li>
              <strong>Infrastructure</strong> — Railway (hosting), AWS (storage)
            </li>
            <li>
              <strong>Payment processors</strong> — Stripe, Apple, Google
            </li>
            <li>
              <strong>Legal requirement</strong> — if required by law or to protect the safety of users
            </li>
          </ul>
        </Section>

        <Section title="6. Data Retention">
          <p>
            We retain your account data for as long as your account is active. Uploaded content is
            retained to power your tutor and deleted within 30 days of account closure. Analytics
            events are retained for 12 months. You may request earlier deletion at any time (see
            Section 10).
          </p>
        </Section>

        <Section title="7. Cookies and Tracking">
          <p>
            We use essential cookies to keep you logged in. We use PostHog analytics cookies to
            understand feature usage. We do not use advertising cookies or cross-site tracking. On iOS,
            we request App Tracking Transparency permission before any device identifier is accessed.
          </p>
        </Section>

        <Section title="8. Children's Privacy">
          <p>
            Children under 13 must have a parent or guardian consent before using Apalchi. Centre
            teachers are responsible for obtaining consent from the parents of students they enrol. We
            do not knowingly collect personal data from children under 13 without verifiable parental
            consent.
          </p>
        </Section>

        <Section title="9. Security">
          <p>
            All data in transit is encrypted using TLS 1.2 or higher. Passwords are hashed using
            bcrypt. We conduct periodic security reviews. In the event of a data breach affecting your
            personal data, we will notify you within 72 hours as required by applicable law.
          </p>
        </Section>

        <Section title="10. Your Rights">
          <p>Depending on your jurisdiction, you may have the right to:</p>
          <ul style={listStyle}>
            <li>Access the personal data we hold about you</li>
            <li>Correct inaccurate data</li>
            <li>Request deletion of your data ("right to be forgotten")</li>
            <li>Object to or restrict certain processing</li>
            <li>Data portability (receive your data in a machine-readable format)</li>
          </ul>
          <p style={{ marginTop: 12 }}>
            To exercise any right, email{' '}
            <a href="mailto:privacy@apalchi.com" style={linkStyle}>privacy@apalchi.com</a>. We will
            respond within 30 days.
          </p>
        </Section>

        <Section title="11. Changes to This Policy">
          <p>
            We will notify users of material changes via email or in-app notice at least 14 days
            before they take effect. The &ldquo;Last updated&rdquo; date at the top of this page reflects the
            most recent revision.
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
const listStyle: React.CSSProperties = {
  paddingLeft: 24,
  marginTop: 8,
  lineHeight: 1.9,
  color: '#374151',
};
