'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { api, ApiError } from '@/lib/api';
import { saveAuth } from '@/lib/auth';
import { identify, trackEvent } from '@/lib/analytics';
import { isGoogleEnabled } from '@/lib/google';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [birthYear, setBirthYear] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [showEmail, setShowEmail] = useState(false);

  const CURRENT_YEAR = new Date().getFullYear();
  const MIN_BIRTH_YEAR = 1950;
  const yearNum = Number(birthYear);
  const yearValid = /^\d{4}$/.test(birthYear) && yearNum >= MIN_BIRTH_YEAR && yearNum <= CURRENT_YEAR;
  // Under-13 is computed client-side ONLY to reveal the parent-email field — the
  // server re-derives the age from birthYear and is the real enforcement point.
  const isUnder13 = yearValid && CURRENT_YEAR - yearNum < 13;

  async function afterAuth(token: string, userId: string, eventName: string) {
    saveAuth(token, userId);
    identify(userId, { email: email || undefined });
    trackEvent(eventName);
    router.replace('/dashboard');
  }

  async function handleGoogle(response: CredentialResponse) {
    if (!response.credential) return;
    setError('');
    setLoading(true);
    try {
      const res = await api.google(response.credential);
      await afterAuth(res.data.token, res.data.userId, 'signup_google');
    } catch (err) {
      setError(err instanceof ApiError ? err.userMessage : 'Google sign-in failed. Please try again.');
      setLoading(false);
    }
  }

  async function handleEmail(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (!yearValid) {
      setError(`Please enter a valid birth year between ${MIN_BIRTH_YEAR} and ${CURRENT_YEAR}.`);
      return;
    }
    // Under-13: a parent/guardian email is required. (The server re-checks this.)
    if (isUnder13 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail)) {
      setError("Please enter a valid parent/guardian email so we can ask them to approve the account.");
      return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await api.register({
        email,
        password,
        birthYear: yearNum,
        ...(isUnder13 ? { parentEmail } : {}),
      });
      await afterAuth(res.data.token, res.data.userId, 'signup_email');
    } catch (err) {
      setError(
        err instanceof ApiError
          ? (err.status === 409 ? 'An account with this email already exists. Try logging in.' : err.userMessage)
          : 'Could not create account. Please try again.'
      );
      setLoading(false);
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
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Mochi — clicking returns to homepage */}
        <Link href="/" aria-label="Back to Apalchi home" style={{ display: 'block', textAlign: 'center' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/mochi-base-transparent.png"
            alt="Mochi"
            style={{ width: 72, height: 72, objectFit: 'contain', display: 'inline-block', marginBottom: 20, cursor: 'pointer' }}
          />
        </Link>

        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1F1733', textAlign: 'center', marginBottom: 6 }}>
          Create your Apalchi account
        </h1>
        <p style={{ fontSize: 14, color: '#6B618A', textAlign: 'center', marginBottom: 28, lineHeight: 1.6 }}>
          Start a 30-day pilot — no card required.
        </p>

        {/* Google button — only when a web client ID is configured. */}
        {isGoogleEnabled && (
          <>
            <div style={{ marginBottom: 16 }}>
              <GoogleLogin
                onSuccess={handleGoogle}
                onError={() => setError('Google sign-in failed. Please try again.')}
                text="continue_with"
                shape="rectangular"
                size="large"
                width="400"
                logo_alignment="left"
                auto_select={false}
              />
            </div>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1, height: 1, background: '#E0DAF0' }} />
              <span style={{ fontSize: 12, color: '#A8A0BD', fontWeight: 600 }}>or</span>
              <div style={{ flex: 1, height: 1, background: '#E0DAF0' }} />
            </div>
          </>
        )}

        {/* Email section */}
        {!showEmail ? (
          <button
            onClick={() => setShowEmail(true)}
            style={{
              width: '100%',
              padding: '13px 0',
              background: '#fff',
              color: '#1F1733',
              border: '1.5px solid #E0DAF0',
              borderRadius: 12,
              fontSize: 15,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            Continue with email
          </button>
        ) : (
          <form onSubmit={handleEmail} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label htmlFor="su-email" style={{ fontSize: 13, fontWeight: 700, color: '#1F1733' }}>Email address</label>
              <input
                id="su-email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@centre.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ padding: '11px 14px', borderRadius: 10, border: '1.5px solid #E0DAF0', fontSize: 14, color: '#1F1733', fontFamily: 'inherit', background: '#fff', outline: 'none' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label htmlFor="su-pw" style={{ fontSize: 13, fontWeight: 700, color: '#1F1733' }}>Password <span style={{ fontWeight: 400, color: '#A8A0BD' }}>(min 8 characters)</span></label>
              <input
                id="su-pw"
                type="password"
                required
                autoComplete="new-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ padding: '11px 14px', borderRadius: 10, border: '1.5px solid #E0DAF0', fontSize: 14, color: '#1F1733', fontFamily: 'inherit', background: '#fff', outline: 'none' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <label htmlFor="su-year" style={{ fontSize: 13, fontWeight: 700, color: '#1F1733' }}>Your birth year</label>
              <input
                id="su-year"
                type="number"
                required
                inputMode="numeric"
                min={MIN_BIRTH_YEAR}
                max={CURRENT_YEAR}
                placeholder="e.g. 2012"
                value={birthYear}
                onChange={(e) => setBirthYear(e.target.value)}
                style={{ padding: '11px 14px', borderRadius: 10, border: '1.5px solid #E0DAF0', fontSize: 14, color: '#1F1733', fontFamily: 'inherit', background: '#fff', outline: 'none' }}
              />
            </div>
            {isUnder13 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <label htmlFor="su-parent" style={{ fontSize: 13, fontWeight: 700, color: '#1F1733' }}>Parent/guardian email</label>
                <input
                  id="su-parent"
                  type="email"
                  aria-required="true"
                  autoComplete="off"
                  placeholder="parent@example.com"
                  value={parentEmail}
                  onChange={(e) => setParentEmail(e.target.value)}
                  style={{ padding: '11px 14px', borderRadius: 10, border: '1.5px solid #E0DAF0', fontSize: 14, color: '#1F1733', fontFamily: 'inherit', background: '#fff', outline: 'none' }}
                />
                <p style={{ fontSize: 12, color: '#6B618A', lineHeight: 1.5, marginTop: 2 }}>
                  Because you&apos;re under 13, a parent/guardian must approve your account before you can
                  upload your own notes. You can still log in and use your centre&apos;s lessons.
                </p>
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 4,
                padding: '13px 0',
                background: '#4C6FFF',
                color: '#fff',
                borderRadius: 12,
                border: 'none',
                fontSize: 15,
                fontWeight: 800,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.65 : 1,
              }}
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>
        )}

        {/* Error */}
        {error && (
          <div
            style={{
              marginTop: 12,
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

        {/* Footer links */}
        <p style={{ textAlign: 'center', fontSize: 13, color: '#A8A0BD', marginTop: 24 }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: '#4C6FFF', fontWeight: 700 }}>Log in</Link>
        </p>
        <p style={{ textAlign: 'center', fontSize: 13, color: '#A8A0BD', marginTop: 8 }}>
          Running a school or large centre?{' '}
          <Link href="/demo" style={{ color: '#4C6FFF', fontWeight: 700 }}>Book a demo instead</Link>
        </p>
      </div>
    </div>
  );
}
