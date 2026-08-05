'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { api, ApiError } from '@/lib/api';
import { saveAuth } from '@/lib/auth';
import { identify, trackEvent } from '@/lib/analytics';
import { isGoogleEnabled } from '@/lib/google';
import { useTranslation } from '@/lib/messages';

export default function SignupPage() {
  const { t } = useTranslation();
  const router = useRouter();

  // Centre profile — collected from everyone (Google and email paths alike)
  const [contactName, setContactName] = useState('');
  const [orgName, setOrgName]         = useState('');
  const [phone, setPhone]             = useState('');

  // Email-path only
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [showEmail, setShowEmail]     = useState(false);

  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  function validateProfile(): boolean {
    if (!contactName.trim()) { setError(t('signupNameRequired')); return false; }
    if (!orgName.trim())     { setError(t('signupOrgRequired')); return false; }
    if (!phone.trim())       { setError(t('signupPhoneRequired')); return false; }
    return true;
  }

  async function finishSetup(token: string, userId: string, eventName: string) {
    saveAuth(token, userId);
    // Do NOT send email to PostHog (US-hosted) — PDPA overseas-transfer of PII.
    // The userId UUID is sufficient for identity stitching.
    identify(userId);
    try {
      await api.onboardCentre(orgName.trim());
    } catch {
      // onboard failure is non-fatal for the session — dashboard handles retry.
    }
    trackEvent(eventName);
    router.replace('/dashboard');
  }

  async function handleGoogle(response: CredentialResponse) {
    if (!response.credential) return;
    setError('');
    if (!validateProfile()) return;
    setLoading(true);
    try {
      const res = await api.google(response.credential);
      await finishSetup(res.data.token, res.data.userId, 'signup_google');
    } catch (err) {
      setError(err instanceof ApiError ? err.userMessage : t('signupGoogleFailedFallback'));
      setLoading(false);
    }
  }

  async function handleEmail(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError('');
    if (!validateProfile()) return;
    if (!email.trim())         { setError(t('signupEmailRequired')); return; }
    if (password.length < 8)   { setError(t('signupPasswordTooShort')); return; }
    setLoading(true);
    try {
      const res = await api.register({
        email: email.trim(),
        password,
        displayName: contactName.trim(),
      });
      await finishSetup(res.data.token, res.data.userId, 'signup_email');
    } catch (err) {
      setError(
        err instanceof ApiError
          ? (err.status === 409
              ? t('signupEmailExistsError')
              : err.userMessage)
          : t('signupCreateAccountErrorFallback')
      );
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    padding: '11px 14px', borderRadius: 10, border: '1.5px solid #E0DAF0',
    fontSize: 14, color: '#1F1733', fontFamily: 'inherit',
    background: '#fff', outline: 'none', width: '100%', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: '#1F1733' };
  const fieldStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 4 };

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
        position: 'relative',
      }}
    >
      {/* Top-left home link */}
      <a
        href="/"
        style={{
          position: 'absolute', top: 20, left: 24,
          display: 'flex', alignItems: 'center', gap: 8,
          textDecoration: 'none', zIndex: 10,
        }}
      >
        <Image src="/mochi-base-transparent.png" alt="" aria-hidden="true"
          width={28} height={28} style={{ objectFit: 'contain' }} />
        <span style={{ fontWeight: 800, fontSize: 16, color: '#1F1733' }}>{t('appName')}</span>
      </a>

      <div style={{ width: '100%', maxWidth: 420 }}>
        <Image
          src="/mochi-base-transparent.png"
          alt="Mochi"
          width={72}
          height={72}
          style={{ objectFit: 'contain', display: 'block', margin: '0 auto 20px' }}
        />

        <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1F1733', textAlign: 'center', marginBottom: 6 }}>
          {t('signupHeading')}
        </h1>
        <p style={{ fontSize: 14, color: '#6B618A', textAlign: 'center', marginBottom: 28, lineHeight: 1.6 }}>
          {t('signupSubtitle')}
        </p>

        {/* ── Centre profile fields (mandatory for all auth paths) ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 20 }}>
          <div style={fieldStyle}>
            <label htmlFor="su-name" style={labelStyle}>{t('signupYourName')}</label>
            <input
              id="su-name" type="text" required placeholder={t('signupNamePlaceholder')}
              value={contactName} onChange={(e) => setContactName(e.target.value)}
              style={inputStyle} autoComplete="name"
            />
          </div>
          <div style={fieldStyle}>
            <label htmlFor="su-org" style={labelStyle}>{t('signupOrgLabel')}</label>
            <input
              id="su-org" type="text" required placeholder={t('signupOrgPlaceholder')}
              value={orgName} onChange={(e) => setOrgName(e.target.value)}
              style={inputStyle} autoComplete="organization"
            />
          </div>
          <div style={fieldStyle}>
            <label htmlFor="su-phone" style={labelStyle}>{t('signupContactNumber')}</label>
            <input
              id="su-phone" type="tel" required placeholder="+65 9123 4567"
              value={phone} onChange={(e) => setPhone(e.target.value)}
              style={inputStyle} autoComplete="tel"
            />
          </div>
        </div>

        {/* ── Auth methods ── */}
        {isGoogleEnabled && !showEmail && (
          <>
            <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
              <GoogleLogin
                onSuccess={handleGoogle}
                onError={() => setError(t('signupGoogleFailedFallback'))}
                text="continue_with"
                shape="rectangular"
                size="large"
                width="420"
                logo_alignment="left"
                auto_select={false}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ flex: 1, height: 1, background: '#E0DAF0' }} />
              <span style={{ fontSize: 12, color: '#A8A0BD', fontWeight: 600 }}>{t('signupOr')}</span>
              <div style={{ flex: 1, height: 1, background: '#E0DAF0' }} />
            </div>
            <button
              type="button"
              onClick={() => setShowEmail(true)}
              style={{
                width: '100%', padding: '13px 0', background: '#fff',
                color: '#1F1733', border: '1.5px solid #E0DAF0', borderRadius: 12,
                fontSize: 15, fontWeight: 700, cursor: 'pointer',
              }}
            >
              {t('signupContinueWithEmail')}
            </button>
          </>
        )}

        {(!isGoogleEnabled || showEmail) && (
          <form onSubmit={handleEmail} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={fieldStyle}>
              <label htmlFor="su-email" style={labelStyle}>{t('signupWorkEmail')}</label>
              <input
                id="su-email" type="email" required placeholder="jane@brightstar.edu"
                value={email} onChange={(e) => setEmail(e.target.value)}
                style={inputStyle} autoComplete="email"
              />
            </div>
            <div style={fieldStyle}>
              <label htmlFor="su-pw" style={labelStyle}>
                {t('signupPasswordLabel')}{' '}
                <span style={{ fontWeight: 400, color: '#A8A0BD' }}>{t('signupPasswordHint')}</span>
              </label>
              <input
                id="su-pw" type="password" required placeholder="••••••••"
                value={password} onChange={(e) => setPassword(e.target.value)}
                style={inputStyle} autoComplete="new-password"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 4, padding: '13px 0', background: '#4C6FFF',
                color: '#fff', borderRadius: 12, border: 'none',
                fontSize: 15, fontWeight: 800,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.65 : 1,
              }}
            >
              {loading ? t('signupCreatingAccount') : t('signupCreateAccount')}
            </button>
            {isGoogleEnabled && (
              <button
                type="button"
                onClick={() => setShowEmail(false)}
                style={{
                  background: 'none', border: 'none', color: '#A8A0BD',
                  fontSize: 13, cursor: 'pointer', textAlign: 'center',
                }}
              >
                {t('signupBackToSignIn')}
              </button>
            )}
          </form>
        )}

        {error && (
          <div
            style={{
              marginTop: 14,
              padding: '10px 14px',
              borderRadius: 10,
              background: 'color-mix(in srgb, #FF6660 12%, transparent)',
              border: '1.5px solid color-mix(in srgb, #FF6660 30%, transparent)',
              color: '#C0392B', fontWeight: 700, fontSize: 13,
            }}
          >
            {error}
          </div>
        )}

        <p style={{ textAlign: 'center', fontSize: 13, color: '#A8A0BD', marginTop: 24 }}>
          {t('signupAlreadyHaveAccount')}{' '}
          <Link href="/login" style={{ color: '#4C6FFF', fontWeight: 700 }}>{t('signupSignIn')}</Link>
        </p>
      </div>
    </div>
  );
}
