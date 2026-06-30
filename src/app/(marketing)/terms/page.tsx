import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service — Apalchi',
  description: 'Apalchi Terms of Service',
};

export default function TermsPage() {
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
          Terms of Service
        </h1>
        <p style={{ color: '#6b7280', marginBottom: 48 }}>Last updated: June 2026</p>

        <Section title="1. Who We Are">
          <p>
            Apalchi is an AI-powered study platform operated by CATALYX SYSTEM PTE. LTD, registered
            in Singapore. We provide personalised AI tutoring tools for students and tuition centres.
            If you have questions about these terms, contact us at{' '}
            <a href="mailto:hello@apalchi.com" style={linkStyle}>hello@apalchi.com</a>.
          </p>
        </Section>

        <Section title="2. Acceptance of Terms">
          <p>
            By creating an account or using Apalchi, you agree to these terms. If you are under 13,
            Apalchi&apos;s parental consent process must be completed before you can access AI features —
            your account will be restricted until a parent or guardian approves via the consent email
            we send them. See our{' '}
            <Link href="/privacy" style={linkStyle}>Privacy Policy</Link> for details on how parental
            consent is obtained and recorded.
          </p>
        </Section>

        <Section title="3. What Apalchi Does">
          <p>
            Apalchi lets students chat with an AI tutor trained on their class materials. Teachers can
            upload notes and worksheets. The AI generates lessons, quizzes, and flashcards. All AI
            outputs are generated content and may contain errors — teachers and students should verify
            important information independently.
          </p>
        </Section>

        <Section title="4. Accounts">
          <p>
            You must provide accurate information when signing up. You are responsible for keeping your
            password secure. You may not share accounts or use another person&apos;s account. We may suspend
            or close accounts that violate these terms.
          </p>
        </Section>

        <Section title="5. Acceptable Use">
          <p>You agree not to:</p>
          <ul style={listStyle}>
            <li>Upload content that is unlawful, harmful, or sexually explicit</li>
            <li>Attempt to reverse-engineer the AI system</li>
            <li>Use the platform to cheat in formal examinations</li>
            <li>Scrape or copy the platform&apos;s content at scale</li>
            <li>Impersonate another person or organisation</li>
          </ul>
        </Section>

        <Section title="6. AI Disclosure">
          <p>
            Apalchi uses third-party AI services (including Anthropic Claude and Google Gemini) to
            generate educational content. Uploaded notes and questions are sent to these services for
            processing. We do not use your content to train AI models. Data is processed under each
            provider&apos;s standard API terms of service, which include commitments not to use submitted
            data for model training.
          </p>
        </Section>

        <Section title="7. Subscriptions and Billing">
          <p>
            Free accounts include 20 AI messages per day and one AI tutor (Mochi) to start, with an
            additional tutor unlocked as you level up. Paid plans are billed monthly via the App Store
            (iOS), Google Play (Android), or Stripe (web). Refunds are governed by the respective
            platform&apos;s refund policy. You may cancel anytime from your account settings.
          </p>
        </Section>

        <Section title="8. Intellectual Property">
          <p>
            You own your uploaded content. You grant Apalchi a licence to process it solely to provide
            the service to you. Apalchi&apos;s platform, design, and software are our property and may not
            be copied or redistributed.
          </p>
        </Section>

        <Section title="9. Limitation of Liability">
          <p>
            Apalchi is provided &ldquo;as is&rdquo;. We are not liable for indirect damages, loss of data, or
            educational outcomes. Our total liability to you does not exceed the amount you paid us in
            the 12 months before the claim.
          </p>
        </Section>

        <Section title="10. Changes to These Terms">
          <p>
            We will notify users of material changes via email or in-app notice at least 14 days in
            advance. Continued use after that date means you accept the updated terms.
          </p>
        </Section>

        <Section title="11. Governing Law">
          <p>
            These terms are governed by the laws of Singapore. Disputes are subject to the exclusive
            jurisdiction of the Singapore courts.
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
