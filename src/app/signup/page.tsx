'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { saveAuth, getToken } from '@/lib/auth';

// Self-serve centre onboarding: register an admin account, create the centre,
// land in the dashboard — all on the web, no back-office step.
export default function SignupPage() {
  const router = useRouter();
  const [centreName, setCentreName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getToken()) router.replace('/dashboard');
  }, [router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      // 1. register the admin account
      let token: string;
      let userId: string;
      try {
        const reg = await api.register(email, password, name || centreName);
        token = reg.data.token;
        userId = reg.data.userId;
      } catch (err) {
        // Email already registered → fall back to login so existing users can
        // still create their centre.
        const msg = err instanceof Error ? err.message : '';
        if (msg.includes('409') || msg.toLowerCase().includes('exist')) {
          const res = await api.login(email, password);
          token = res.data.token;
          userId = res.data.userId;
        } else {
          throw err;
        }
      }
      saveAuth(token, userId);

      // 2. create the centre (idempotent if they already have one)
      await api.onboardCentre(centreName.trim());

      // 3. into the dashboard
      router.replace('/dashboard');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Signup failed';
      setError(
        msg.includes('401') || msg.includes('403')
          ? 'That email and password don’t match an existing account.'
          : msg.includes('400')
            ? 'Please check your details and try again.'
            : 'Could not create your centre. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-panel border border-line mb-4">
            <span className="text-3xl">🏫</span>
          </div>
          <h1 className="text-2xl font-bold text-ink">Create your centre</h1>
          <p className="text-ink3 text-sm mt-1">Set up your Memoly admin portal</p>
        </div>

        <div className="bg-panel rounded-2xl border border-line p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Field
              id="centreName"
              label="Centre name"
              value={centreName}
              onChange={setCentreName}
              placeholder="ABC Learning Centre"
              autoComplete="organization"
            />
            <Field
              id="name"
              label="Your name"
              value={name}
              onChange={setName}
              placeholder="Jane Tan"
              autoComplete="name"
            />
            <Field
              id="email"
              label="Email address"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="admin@centre.edu"
              autoComplete="email"
            />
            <Field
              id="password"
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="At least 8 characters"
              autoComplete="new-password"
            />

            {error && (
              <div className="bg-bad/10 border border-bad/30 rounded-lg px-3.5 py-2.5 text-sm text-bad">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !centreName.trim() || !email || !password}
              className="w-full py-2.5 px-4 rounded-lg bg-accent text-white text-sm font-semibold
                hover:bg-accent/80 transition-colors disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? 'Creating your centre…' : 'Create centre'}
            </button>
          </form>

          <p className="text-center text-sm text-ink3 mt-6">
            Already have a centre?{' '}
            <a href="/login" className="text-accent font-semibold hover:underline">
              Sign in
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

function Field({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink2 mb-1.5">
        {label}
      </label>
      <input
        id={id}
        type={type}
        autoComplete={autoComplete}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3.5 py-2.5 rounded-lg border border-line bg-panel2 text-ink text-sm
          focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent
          placeholder:text-ink3 transition-colors"
      />
    </div>
  );
}
