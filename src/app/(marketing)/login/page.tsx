'use client';

import { FormEvent, Suspense, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { api, ApiError } from '@/lib/api';
import { resolvePostLoginDest, SAFE_PREFIXES } from '@/lib/post-login';
import { saveAuth, saveLastEmail, getLastEmail } from '@/lib/auth';
import { identify, trackEvent } from '@/lib/analytics';
import { isGoogleEnabled } from '@/lib/google';

const SPARK_COLORS = ['#00BBA4', '#FF6BAE', '#FFB81A', '#FF6660', '#2EC870', '#FFD100', '#2BA8F2'];

function sparkle(stage: HTMLElement) {
  for (let i = 0; i < 14; i++) {
    const s = document.createElement('div');
    s.className = 'mkt-spark';
    s.style.background = SPARK_COLORS[i % SPARK_COLORS.length];
    s.style.left = '50%';
    s.style.top = '42%';
    stage.appendChild(s);
    const angle = (Math.PI * 2 * i) / 14;
    const dist = 60 + Math.random() * 55;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist - 26;
    s.animate(
      [
        { transform: 'translate(-50%,-50%) scale(1)', opacity: '1' },
        { transform: `translate(${dx}px,${dy}px) scale(0)`, opacity: '0' },
      ],
      { duration: 700 + Math.random() * 240, easing: 'cubic-bezier(.3,1,.5,1)' }
    ).onfinish = () => s.remove();
  }
}

function triggerReact(floatEl: HTMLElement, stageEl: HTMLElement, kind: 'ok' | 'err') {
  floatEl.classList.remove('jump', 'wobble');
  void floatEl.offsetWidth;
  if (kind === 'ok') {
    floatEl.classList.add('jump');
    sparkle(stageEl);
  } else {
    floatEl.classList.add('wobble');
  }
}

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [pwFocused, setPwFocused] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const floatRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useRef(false);

  useEffect(() => {
    reducedMotion.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const cached = getLastEmail();
    if (cached) setEmail(cached);
  }, []);

  // Resolve the post-login destination. A safe ?redirect= short-circuits the
  // /me lookup; otherwise we fetch /me and route by identity (a failed lookup
  // routes to /dashboard via the helper's null fallback).
  async function resolveDest(): Promise<string> {
    const returnTo = searchParams.get('redirect');
    const isSafeReturn =
      !!returnTo && SAFE_PREFIXES.some((p) => returnTo.startsWith(p));
    if (isSafeReturn) return resolvePostLoginDest(undefined, returnTo);
    try {
      const me = await api.getMe();
      return resolvePostLoginDest(me, returnTo);
    } catch {
      return resolvePostLoginDest(null, returnTo);
    }
  }

  async function handleGoogle(response: CredentialResponse) {
    if (!response.credential) return;
    setError('');
    setLoading(true);
    try {
      const res = await api.google(response.credential);
      saveAuth(res.data.token, res.data.userId);
      try {
        const payload = JSON.parse(atob(response.credential.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        if (payload.email) saveLastEmail(payload.email);
      } catch { /* non-critical */ }
      identify(res.data.userId, {});
      trackEvent('login_google');
      const dest = await resolveDest();
      if (!reducedMotion.current && floatRef.current && stageRef.current) {
        triggerReact(floatRef.current, stageRef.current, 'ok');
        setTimeout(() => router.replace(dest), 750);
      } else {
        router.replace(dest);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.userMessage : 'Google sign-in failed. Please try again.');
      setLoading(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);

    try {
      const res = await api.login(email, password);
      saveAuth(res.data.token, res.data.userId);
      saveLastEmail(email);
      // No email to PostHog (US-hosted) — PDPA overseas-transfer of PII; userId suffices.
      identify(res.data.userId);
      trackEvent('login');

      // Three-door routing: ADMIN → /admin, centre staff → /dashboard, student → /get-the-app.
      // ?redirect= is honoured for known internal prefixes only — never external URLs.
      const dest = await resolveDest();

      if (!reducedMotion.current && floatRef.current && stageRef.current) {
        triggerReact(floatRef.current, stageRef.current, 'ok');
        setTimeout(() => router.replace(dest), 750);
      } else {
        router.replace(dest);
      }
    } catch (err) {
      if (!reducedMotion.current && floatRef.current && stageRef.current) {
        triggerReact(floatRef.current, stageRef.current, 'err');
      }
      setError(
        err instanceof ApiError
          ? (err.status === 401 || err.status === 403
              ? 'Incorrect email or password.'
              : err.userMessage)
          : 'Could not connect to server. Please try again.'
      );
      setLoading(false);
    }
  }

  return (
    <div className="mkt-login-wrap" style={{ minHeight: '100vh', position: 'relative' }}>
      {/* Top-left home link — standard SaaS nav pattern */}
      <a
        href="/"
        style={{
          position: 'absolute', top: 20, left: 24,
          display: 'flex', alignItems: 'center', gap: 8,
          textDecoration: 'none', zIndex: 10,
        }}
      >
        <Image src="/mochi-base-transparent.png" alt="" aria-hidden="true" width={28} height={28} style={{ objectFit: 'contain' }} />
        <span style={{ fontWeight: 800, fontSize: 16, color: '#1F1733', fontFamily: 'var(--font-nunito), Nunito, sans-serif' }}>Apalchi</span>
      </a>
      <div className="mkt-login-card" style={{ paddingTop: 96 }}>
        {/* Mochi with paw eye-cover */}
        <div
          className={`mkt-hero-mochi mkt-login-mochi ${pwFocused ? 'mkt-cover' : ''}`}
          ref={stageRef}
        >
          <div className="mkt-float" ref={floatRef}>
            {/* next-image-exempt: responsive mkt-mochi-img hero inside a JS float
                animation (floatRef); keep as <img> to avoid dims/wrapper conflicts. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="mkt-mochi-img"
              src="/mochi-base-transparent.png"
              alt="Mochi"
            />
          </div>
          <span className="mkt-paw l" />
          <span className="mkt-paw r" />
        </div>

        <h2>Sign in</h2>
        <p className="mkt-login-sub">Welcome back to Apalchi.</p>

        {/* Google sign-in — only when a web client ID is configured. */}
        {isGoogleEnabled && (
          <>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
              <GoogleLogin
                onSuccess={handleGoogle}
                onError={() => setError('Google sign-in failed. Please try again.')}
                text="continue_with"
                shape="rectangular"
                size="large"
                width="320"
                logo_alignment="center"
                auto_select={false}
              />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1, height: 1, background: '#E0DAF0' }} />
              <span style={{ fontSize: 12, color: '#A8A0BD', fontWeight: 600 }}>or sign in with email</span>
              <div style={{ flex: 1, height: 1, background: '#E0DAF0' }} />
            </div>
          </>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mkt-field">
            <label htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              placeholder="admin@centre.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="mkt-field">
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onFocus={() => setPwFocused(true)}
              onBlur={() => setPwFocused(false)}
            />
          </div>

          {error && (
            <div
              style={{
                marginBottom: 10,
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
            disabled={loading}
            className="mkt-btn mkt-btn-primary"
            style={{ width: '100%', marginTop: 6, opacity: loading ? 0.65 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mkt-alt">
          Want to bring Apalchi to your centre?{' '}
          <a href="/signup">Request access</a>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
