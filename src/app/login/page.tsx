'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { saveAuth, getToken } from '@/lib/auth';
import { identify, trackEvent } from '@/lib/analytics';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (getToken()) {
      router.replace('/dashboard');
    }
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.login(email, password);
      saveAuth(res.data.token, res.data.userId);
      identify(res.data.userId, { email });
      trackEvent('admin_login');
      router.replace('/dashboard');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(
          err.status === 401 || err.status === 403
            ? 'Incorrect email or password.'
            : err.userMessage
        );
      } else {
        setError('Could not connect to server. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        {/* Logo / brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-panel border border-line mb-4">
            <span className="text-3xl">🐾</span>
          </div>
          <h1 className="text-2xl font-bold text-ink">Memoly</h1>
          <p className="text-ink3 text-sm mt-1">Centre Admin Portal</p>
        </div>

        {/* Card */}
        <div className="bg-panel rounded-2xl border border-line p-8">
          <h2 className="text-lg font-semibold text-ink mb-6">Sign in to your account</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-ink2 mb-1.5">
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@centre.edu"
                className="w-full px-3.5 py-2.5 rounded-lg border border-line bg-panel2 text-ink text-sm
                  focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent
                  placeholder:text-ink3 transition-colors"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-ink2 mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 rounded-lg border border-line bg-panel2 text-ink text-sm
                  focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent
                  placeholder:text-ink3 transition-colors"
              />
            </div>

            {error && (
              <div className="bg-bad/10 border border-bad/30 rounded-lg px-3.5 py-2.5 text-sm text-bad">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-accent text-white text-sm font-semibold
                hover:bg-accent/80 active:bg-accent/70 transition-colors disabled:opacity-60 disabled:cursor-not-allowed
                mt-2"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-sm text-ink3 mt-6">
            New centre?{' '}
            <a href="/signup" className="text-accent font-semibold hover:underline">
              Create your centre
            </a>
          </p>
        </div>

        <p className="text-center text-xs text-ink3 mt-6">
          Memoly Centre Admin · Powered by Pally AI
        </p>
      </div>
    </div>
  );
}
