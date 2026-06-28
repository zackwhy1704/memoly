'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';

const CALENDLY = process.env.NEXT_PUBLIC_CALENDLY_URL ?? null;

export default function DemoPage() {
  const [orgName, setOrgName]       = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail]           = useState('');
  const [phone, setPhone]           = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState('');
  const [submitted, setSubmitted]   = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;

    // Client-side validation
    if (!orgName.trim()) { setError('Please enter your organisation name.'); return; }
    if (!contactName.trim()) { setError('Please enter your name.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('Please enter a valid email address.'); return; }
    if (!phone.trim()) { setError('Please enter a contact number.'); return; }

    setError('');
    setSubmitting(true);
    try {
      await api.demoRequest({ orgName: orgName.trim(), contactName: contactName.trim(), email: email.trim(), phone: phone.trim() });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.userMessage : 'Could not send your request. Please try again.');
    } finally {
      setSubmitting(false);
    }
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
      {/* Mochi — clicking returns to homepage */}
      <Link href="/" aria-label="Back to Apalchi home">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/mochi-base-transparent.png"
          alt="Mochi"
          style={{ width: 80, height: 80, objectFit: 'contain', marginBottom: 20, cursor: 'pointer' }}
        />
      </Link>

      {submitted ? (
        <Confirmation name={contactName} />
      ) : (
        <div style={{ width: '100%', maxWidth: 440 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1F1733', marginBottom: 6, textAlign: 'center' }}>
            Book an institute demo
          </h1>
          <p style={{ color: '#6B618A', fontSize: 14, textAlign: 'center', marginBottom: 28, lineHeight: 1.6 }}>
            Tell us about your centre and we&apos;ll reach out to set up a personalised walkthrough.
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Field label="Organisation / centre name" id="d-org"  type="text"  value={orgName}      onChange={setOrgName}      placeholder="Bright Stars Tuition" />
            <Field label="Your name"                  id="d-name" type="text"  value={contactName}  onChange={setContactName}  placeholder="Jane Smith"           />
            <Field label="Work email"                 id="d-em"   type="email" value={email}        onChange={setEmail}        placeholder="jane@brightstar.edu"  />
            <Field label="Contact number"             id="d-ph"   type="tel"   value={phone}        onChange={setPhone}        placeholder="+65 9123 4567"        />

            {error && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: 'color-mix(in srgb, #FF6660 12%, transparent)',
                  border: '1.5px solid color-mix(in srgb, #FF6660 30%, transparent)',
                  color: '#C0392B',
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              style={{
                marginTop: 8,
                padding: '13px 0',
                background: '#4C6FFF',
                color: '#fff',
                borderRadius: 12,
                border: 'none',
                fontSize: 15,
                fontWeight: 800,
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.65 : 1,
              }}
            >
              {submitting ? 'Sending…' : 'Request a demo'}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 13, color: '#A8A0BD', marginTop: 20 }}>
            Already have an invite?{' '}
            <Link href="/login" style={{ color: '#4C6FFF', fontWeight: 700 }}>Sign in</Link>
          </p>
        </div>
      )}
    </div>
  );
}

function Confirmation({ name }: { name: string }) {
  return (
    <div style={{ textAlign: 'center', maxWidth: 420 }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🎉</div>
      <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1F1733', marginBottom: 8 }}>
        Thanks, {name}!
      </h1>
      <p style={{ color: '#6B618A', fontSize: 15, lineHeight: 1.6, marginBottom: 28 }}>
        We&apos;ve received your request and sent you a confirmation email. Pick a time that
        works and we&apos;ll walk you through Apalchi:
      </p>

      {CALENDLY ? (
        <a
          href={CALENDLY}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            padding: '14px 32px',
            background: '#4C6FFF',
            color: '#fff',
            borderRadius: 12,
            textDecoration: 'none',
            fontSize: 15,
            fontWeight: 800,
          }}
        >
          Book a time →
        </a>
      ) : (
        <p style={{ color: '#A8A0BD', fontSize: 14 }}>
          We&apos;ll email you a booking link within one business day.
        </p>
      )}

      <p style={{ color: '#A8A0BD', fontSize: 13, marginTop: 24 }}>
        <Link href="/" style={{ color: '#4C6FFF' }}>Back to Apalchi</Link>
      </p>
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
