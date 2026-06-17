'use client';

import { FormEvent, useState } from 'react';

// Request-access page — replaces self-serve centre signup.
// Centre provisioning is now invite-driven: platform admin creates a token,
// the prospective centre owner accepts it via /accept-invite/[token].
export default function SignupPage() {
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [centre, setCentre]   = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    // Fire-and-forget mailto — no backend call needed for a simple request form.
    window.location.href =
      `mailto:hello@apalchi.com?subject=${encodeURIComponent('Centre access request: ' + centre)}&body=${encodeURIComponent(`Name: ${name}\nEmail: ${email}\nCentre: ${centre}`)}`;
    setTimeout(() => setSubmitted(true), 800);
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        background: 'linear-gradient(160deg, #f4f0ff 0%, #fff 60%)',
        fontFamily: 'Nunito, system-ui, sans-serif',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/mochi-base-transparent.png"
        alt="Mochi"
        style={{ width: 80, height: 80, objectFit: 'contain', marginBottom: 20 }}
      />

      {submitted ? (
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1F1733', marginBottom: 8 }}>
            Request sent!
          </h1>
          <p style={{ color: '#6B618A', fontSize: 15, lineHeight: 1.6 }}>
            We&apos;ll be in touch soon to set up your centre on Apalchi.
          </p>
        </div>
      ) : (
        <div style={{ width: '100%', maxWidth: 420 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1F1733', marginBottom: 6, textAlign: 'center' }}>
            Bring Apalchi to your centre
          </h1>
          <p style={{ color: '#6B618A', fontSize: 14, textAlign: 'center', marginBottom: 28, lineHeight: 1.6 }}>
            We&apos;ll reach out to set everything up. No self-serve yet — this keeps quality high.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Your name" id="req-name" type="text" value={name} onChange={setName} placeholder="Jane Smith" />
            <Field label="Email address" id="req-email" type="email" value={email} onChange={setEmail} placeholder="jane@school.edu" />
            <Field label="Centre / school name" id="req-centre" type="text" value={centre} onChange={setCentre} placeholder="Bright Stars Tuition" />

            <button
              type="submit"
              disabled={submitting}
              style={{
                marginTop: 8,
                padding: '13px 0',
                background: '#7042ED',
                color: '#fff',
                borderRadius: 12,
                border: 'none',
                fontSize: 15,
                fontWeight: 800,
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.65 : 1,
              }}
            >
              {submitting ? 'Sending…' : 'Request access'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 13, color: '#A8A0BD', marginTop: 20 }}>
            Already have an invite?{' '}
            <a href="/login" style={{ color: '#7042ED', fontWeight: 700 }}>Sign in</a>
          </p>
        </div>
      )}
    </div>
  );
}

function Field({
  label, id, type, value, onChange, placeholder,
}: {
  label: string; id: string; type: string;
  value: string; onChange: (v: string) => void; placeholder: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label htmlFor={id} style={{ fontSize: 13, fontWeight: 700, color: '#1F1733' }}>{label}</label>
      <input
        id={id}
        type={type}
        required
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: '11px 14px',
          borderRadius: 10,
          border: '1.5px solid #E0DAF0',
          fontSize: 14,
          color: '#1F1733',
          outline: 'none',
          fontFamily: 'inherit',
          background: '#fff',
        }}
      />
    </div>
  );
}
