'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';

type Phase = 'loading' | 'preview' | 'confirming' | 'done' | 'error';
type InviteRole = 'OWNER' | 'STAFF';

export default function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [phase, setPhase]         = useState<Phase>('loading');
  const [centreName, setCentreName] = useState('');
  const [role, setRole]           = useState<InviteRole>('OWNER');
  const [orgId, setOrgId]         = useState('');
  const [errorMsg, setErrorMsg]   = useState('');

  useEffect(() => {
    if (!token) return;
    api.getInvite(token)
      .then((res) => {
        setCentreName(res.data.centreName);
        setRole((res.data.role as InviteRole) ?? 'OWNER');
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

  const isOwner = role === 'OWNER';

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 24px',
        background: 'linear-gradient(160deg, #FBF4EE 0%, #fff 60%)',
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
        <p style={{ color: '#6B604E', fontSize: 15 }}>Loading invite…</p>
      )}

      {phase === 'preview' && (
        <>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#2A2118', marginBottom: 8 }}>
            {isOwner ? "You're invited to join Apalchi" : `Join ${centreName} as a teacher`}
          </h1>
          <p style={{ color: '#6B604E', fontSize: 15, maxWidth: 360, lineHeight: 1.6, marginBottom: 8 }}>
            {isOwner ? (
              <>Set up{' '}<strong style={{ color: '#2A2118' }}>{centreName}</strong>{' '}as your centre on Apalchi.</>
            ) : (
              <>You&apos;ve been invited to teach at{' '}<strong style={{ color: '#2A2118' }}>{centreName}</strong>.</>
            )}
          </p>
          <p style={{ color: '#9C9078', fontSize: 13, marginBottom: 32 }}>
            {getToken()
              ? (isOwner ? 'Click below to create your centre.' : 'Click below to join the centre.')
              : 'Sign in first, then come back to this link.'}
          </p>
          <button
            onClick={handleAccept}
            style={{
              padding: '13px 32px',
              background: 'var(--color-accent)',
              color: '#fff',
              borderRadius: 12,
              border: 'none',
              fontSize: 15,
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            {getToken()
              ? (isOwner ? 'Accept & create centre' : 'Accept & join centre')
              : 'Sign in to accept'}
          </button>
        </>
      )}

      {phase === 'confirming' && (
        <p style={{ color: '#6B604E', fontSize: 15 }}>
          {isOwner ? 'Creating your centre…' : 'Joining centre…'}
        </p>
      )}

      {phase === 'done' && (
        <>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#2A2118', marginBottom: 8 }}>
            {isOwner ? 'Centre created!' : 'You\'re in!'}
          </h1>
          <p style={{ color: '#6B604E', fontSize: 15, maxWidth: 360, lineHeight: 1.6, marginBottom: 32 }}>
            {isOwner ? (
              <>Your centre <strong>{centreName}</strong> is live — set up classes and invite students.</>
            ) : (
              <>You&apos;ve joined <strong>{centreName}</strong> as a teacher. Head to your dashboard to get started.</>
            )}
          </p>
          {isOwner && (
            <p style={{ color: '#9C9078', fontSize: 11, marginBottom: 24, fontFamily: 'monospace' }}>
              org id: {orgId}
            </p>
          )}
          <button
            onClick={() => router.replace('/dashboard')}
            style={{
              padding: '13px 32px',
              background: 'var(--color-accent)',
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
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#2A2118', marginBottom: 8 }}>
            Something went wrong
          </h1>
          <p style={{ color: '#FF6660', fontSize: 14, maxWidth: 360, marginBottom: 24 }}>
            {errorMsg}
          </p>
          <a
            href="/"
            style={{ color: 'var(--color-accent)', fontWeight: 700, fontSize: 14 }}
          >
            Go home
          </a>
        </>
      )}
    </div>
  );
}
