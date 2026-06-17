'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';

type Phase = 'loading' | 'preview' | 'confirming' | 'done' | 'error';

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [phase, setPhase]         = useState<Phase>('loading');
  const [centreName, setCentreName] = useState('');
  const [orgId, setOrgId]         = useState('');
  const [errorMsg, setErrorMsg]   = useState('');

  useEffect(() => {
    if (!token) return;
    api.getInvite(token)
      .then((res) => {
        setCentreName(res.data.centreName);
        setPhase('preview');
      })
      .catch((err) => {
        setErrorMsg(
          err instanceof ApiError
            ? err.userMessage
            : 'Could not load invite details.'
        );
        setPhase('error');
      });
  }, [token]);

  async function handleAccept() {
    if (phase === 'confirming') return;
    if (!getToken()) {
      // Store the invite token and redirect to login
      sessionStorage.setItem('pending_invite', token);
      router.replace(`/login?redirect=/accept-invite/${token}`);
      return;
    }
    setPhase('confirming');
    try {
      const res = await api.acceptInvite(token);
      setOrgId(res.data.orgId);
      setPhase('done');
    } catch (err) {
      setErrorMsg(
        err instanceof ApiError ? err.userMessage : 'Could not accept invite.'
      );
      setPhase('error');
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
        textAlign: 'center',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/mochi-base-transparent.png"
        alt="Mochi"
        style={{ width: 80, height: 80, objectFit: 'contain', marginBottom: 20 }}
      />

      {phase === 'loading' && (
        <p style={{ color: '#6B618A', fontSize: 15 }}>Loading invite…</p>
      )}

      {phase === 'preview' && (
        <>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1F1733', marginBottom: 8 }}>
            You&apos;re invited to join Apalchi
          </h1>
          <p style={{ color: '#6B618A', fontSize: 15, maxWidth: 360, lineHeight: 1.6, marginBottom: 8 }}>
            Set up{' '}
            <strong style={{ color: '#1F1733' }}>{centreName}</strong>{' '}
            as your centre on Apalchi.
          </p>
          <p style={{ color: '#A8A0BD', fontSize: 13, marginBottom: 32 }}>
            {getToken() ? 'Click below to create your centre.' : 'Sign in first, then come back to this link.'}
          </p>
          <button
            onClick={handleAccept}
            style={{
              padding: '13px 32px',
              background: '#7042ED',
              color: '#fff',
              borderRadius: 12,
              border: 'none',
              fontSize: 15,
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            {getToken() ? 'Accept & create centre' : 'Sign in to accept'}
          </button>
        </>
      )}

      {phase === 'confirming' && (
        <p style={{ color: '#6B618A', fontSize: 15 }}>Creating your centre…</p>
      )}

      {phase === 'done' && (
        <>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1F1733', marginBottom: 8 }}>
            Centre created!
          </h1>
          <p style={{ color: '#6B618A', fontSize: 15, maxWidth: 360, lineHeight: 1.6, marginBottom: 32 }}>
            <strong>{centreName}</strong> is live. Head to your dashboard to set up classes and invite students.
          </p>
          <p style={{ color: '#A8A0BD', fontSize: 11, marginBottom: 24, fontFamily: 'monospace' }}>
            org id: {orgId}
          </p>
          <button
            onClick={() => router.replace('/dashboard')}
            style={{
              padding: '13px 32px',
              background: '#7042ED',
              color: '#fff',
              borderRadius: 12,
              border: 'none',
              fontSize: 15,
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            Go to dashboard
          </button>
        </>
      )}

      {phase === 'error' && (
        <>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1F1733', marginBottom: 8 }}>
            Something went wrong
          </h1>
          <p style={{ color: '#FF6660', fontSize: 14, maxWidth: 360, marginBottom: 24 }}>
            {errorMsg}
          </p>
          <a
            href="/"
            style={{ color: '#7042ED', fontWeight: 700, fontSize: 14 }}
          >
            Go home
          </a>
        </>
      )}
    </div>
  );
}
