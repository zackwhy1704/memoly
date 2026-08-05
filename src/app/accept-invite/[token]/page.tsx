'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { useTranslation } from '@/lib/messages';

type Phase = 'loading' | 'preview' | 'confirming' | 'done' | 'error';
type InviteRole = 'OWNER' | 'STAFF';

export default function AcceptInvitePage() {
  const { t, tp } = useTranslation();
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [phase, setPhase]         = useState<Phase>('loading');
  const [centreName, setCentreName] = useState('');
  const [role, setRole]           = useState<InviteRole>('OWNER');
  const [orgId, setOrgId]         = useState('');
  const [errorMsg, setErrorMsg]   = useState('');
  // Primitive string, not the `t` function itself — stable across renders
  // unless the locale actually changes, so it's a safe, correct effect dep
  // (unlike `t`, which is a fresh closure every render and would re-fire
  // this fetch on every unrelated re-render if listed directly).
  const loadErrorFallback = t('acceptInviteLoadErrorFallback');

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
            : loadErrorFallback
        );
        setPhase('error');
      });
  }, [token, loadErrorFallback]);

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
        err instanceof ApiError ? err.userMessage : t('acceptInviteAcceptErrorFallback')
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
        background: 'linear-gradient(160deg, #f4f0ff 0%, #fff 60%)',
        fontFamily: 'Nunito, system-ui, sans-serif',
        textAlign: 'center',
      }}
    >
      <Image
        src="/mochi-base-transparent.png"
        alt="Mochi"
        width={80}
        height={80}
        style={{ objectFit: 'contain', marginBottom: 20 }}
      />

      {phase === 'loading' && (
        <p style={{ color: '#6B618A', fontSize: 15 }}>{t('acceptInviteLoading')}</p>
      )}

      {phase === 'preview' && (
        <>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1F1733', marginBottom: 8 }}>
            {isOwner ? t('acceptInviteOwnerTitle') : tp.acceptInviteStaffTitle(centreName)}
          </h1>
          <p style={{ color: '#6B618A', fontSize: 15, maxWidth: 360, lineHeight: 1.6, marginBottom: 8 }}>
            {isOwner ? (
              <>{t('acceptInviteOwnerBodyPrefix')}<strong style={{ color: '#1F1733' }}>{centreName}</strong>{t('acceptInviteOwnerBodySuffix')}</>
            ) : (
              <>{t('acceptInviteStaffBodyPrefix')}<strong style={{ color: '#1F1733' }}>{centreName}</strong>{t('acceptInviteStaffBodySuffix')}</>
            )}
          </p>
          <p style={{ color: '#A8A0BD', fontSize: 13, marginBottom: 32 }}>
            {getToken()
              ? (isOwner ? t('acceptInviteClickCreateCentre') : t('acceptInviteClickJoinCentre'))
              : t('acceptInviteSignInFirst')}
          </p>
          <button
            onClick={handleAccept}
            style={{
              padding: '13px 32px',
              background: '#4C6FFF',
              color: '#fff',
              borderRadius: 12,
              border: 'none',
              fontSize: 15,
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            {getToken()
              ? (isOwner ? t('acceptInviteAcceptCreateCentre') : t('acceptInviteAcceptJoinCentre'))
              : t('acceptInviteSignInToAccept')}
          </button>
        </>
      )}

      {phase === 'confirming' && (
        <p style={{ color: '#6B618A', fontSize: 15 }}>
          {isOwner ? t('acceptInviteCreatingCentre') : t('acceptInviteJoiningCentre')}
        </p>
      )}

      {phase === 'done' && (
        <>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#1F1733', marginBottom: 8 }}>
            {isOwner ? t('acceptInviteCentreCreated') : t('acceptInviteYoureIn')}
          </h1>
          <p style={{ color: '#6B618A', fontSize: 15, maxWidth: 360, lineHeight: 1.6, marginBottom: 32 }}>
            {isOwner ? (
              <>{t('acceptInviteOwnerDonePrefix')}<strong>{centreName}</strong>{t('acceptInviteOwnerDoneSuffix')}</>
            ) : (
              <>{t('acceptInviteStaffDonePrefix')}<strong>{centreName}</strong>{t('acceptInviteStaffDoneSuffix')}</>
            )}
          </p>
          {isOwner && (
            <p style={{ color: '#A8A0BD', fontSize: 11, marginBottom: 24, fontFamily: 'monospace' }}>
              {t('acceptInviteOrgIdLabel')}{orgId}
            </p>
          )}
          <button
            onClick={() => router.replace('/dashboard')}
            style={{
              padding: '13px 32px',
              background: '#4C6FFF',
              color: '#fff',
              borderRadius: 12,
              border: 'none',
              fontSize: 15,
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            {t('acceptInviteGoToDashboard')}
          </button>
        </>
      )}

      {phase === 'error' && (
        <>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1F1733', marginBottom: 8 }}>
            {t('acceptInviteSomethingWrong')}
          </h1>
          <p style={{ color: '#FF6660', fontSize: 14, maxWidth: 360, marginBottom: 24 }}>
            {errorMsg}
          </p>
          <a
            href="/"
            style={{ color: '#4C6FFF', fontWeight: 700, fontSize: 14 }}
          >
            {t('acceptInviteGoHome')}
          </a>
        </>
      )}
    </div>
  );
}
