'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { saveAuth, getToken } from '@/lib/auth';
import { identify, trackEvent } from '@/lib/analytics';

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

export default function LoginPage() {
  const router = useRouter();
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
    if (getToken()) router.replace('/dashboard');
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);

    try {
      const res = await api.login(email, password);
      saveAuth(res.data.token, res.data.userId);
      identify(res.data.userId, { email });
      trackEvent('admin_login');

      if (!reducedMotion.current && floatRef.current && stageRef.current) {
        triggerReact(floatRef.current, stageRef.current, 'ok');
        setTimeout(() => router.replace('/dashboard'), 750);
      } else {
        router.replace('/dashboard');
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
    <div className="mkt-login-wrap" style={{ minHeight: '100vh' }}>
      <div className="mkt-login-card" style={{ paddingTop: 96 }}>
        {/* Mochi with paw eye-cover */}
        <div
          className={`mkt-hero-mochi mkt-login-mochi ${pwFocused ? 'mkt-cover' : ''}`}
          ref={stageRef}
        >
          <div className="mkt-float" ref={floatRef}>
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

        <h2>Centre Admin</h2>
        <p className="mkt-login-sub">Sign in to your Apalchi centre portal.</p>

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
          New centre?{' '}
          <a href="/signup">Create your centre</a>
        </p>
      </div>
    </div>
  );
}
