'use client';

import { Suspense, useEffect, useState } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { apiFetch } from '@/lib/api';
import { useTranslation } from '@/lib/messages';

type View =
  | { state: 'confirm' }
  | { state: 'loading' }
  | { state: 'success' }
  | { state: 'already_used' }
  | { state: 'expired' }
  | { state: 'invalid' }
  | { state: 'error'; message: string };

function ConsentApproveBody() {
  const { t } = useTranslation();
  const params = useSearchParams();
  const token = params.get('token');
  // Start at a human-confirm step — NEVER auto-fire the state-changing POST on
  // load. Email link-scanners / preview bots fetch the URL but don't click, so
  // the one-time token survives for the real parent, and consent is genuinely
  // human-attested (a person clicked Approve, not an antivirus proxy).
  const [view, setView] = useState<View>({ state: token ? 'confirm' : 'invalid' });

  useEffect(() => {
    if (!token) setView({ state: 'invalid' });
  }, [token]);

  function approve() {
    if (!token) return;
    setView({ state: 'loading' });
    apiFetch<{ data: { status: string } }>(
      `/consent/approve?token=${encodeURIComponent(token)}`,
      { method: 'POST', skipAuth: true }
    )
      .then(() => setView({ state: 'success' }))
      .catch((err) => {
        const msg: string = err?.message ?? '';
        if (msg.includes('already been used')) {
          setView({ state: 'already_used' });
        } else if (msg.includes('expired')) {
          setView({ state: 'expired' });
        } else if (err?.status === 404) {
          setView({ state: 'invalid' });
        } else {
          setView({ state: 'error', message: msg || t('deleteAccountUnexpectedErrorFallback') });
        }
      });
  }

  const retry = approve;

  return (
    <>
      {view.state === 'confirm' && (
        <div className="mt-6 bg-white border border-[#E0DAF0] rounded-2xl p-8 shadow-sm">
          <h2 className="text-lg font-bold text-[#1F1733] mb-2">{t('consentApproveHeadingApprove')}</h2>
          <p className="text-[#6B618A] text-sm mb-5">
            {t('consentApproveBody')}
          </p>
          <button
            onClick={approve}
            className="w-full bg-[#4C6FFF] hover:bg-[#3d5ae6] text-white font-semibold rounded-xl py-3 transition"
          >
            {t('consentApproveButton')}
          </button>
        </div>
      )}

      {view.state === 'loading' && (
        <div className="mt-8 flex flex-col items-center gap-4">
          <span className="w-8 h-8 border-4 border-[#4C6FFF] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#6B618A] text-sm">{t('consentApproveProcessing')}</p>
        </div>
      )}

      {view.state === 'success' && (
        <div className="mt-6 bg-white border border-[#E0DAF0] rounded-2xl p-8 shadow-sm">
          <h2 className="text-lg font-bold text-[#1F1733] mb-2">{t('consentApproveAllDoneTitle')}</h2>
          <p className="text-[#6B618A] text-sm">
            {t('consentApproveAllDoneBody')}
          </p>
        </div>
      )}

      {view.state === 'already_used' && (
        <div className="mt-6 bg-white border border-[#E0DAF0] rounded-2xl p-8 shadow-sm">
          <div className="text-4xl mb-4">✔️</div>
          <h2 className="text-lg font-bold text-[#1F1733] mb-2">{t('consentApproveAlreadyUsedTitle')}</h2>
          <p className="text-[#6B618A] text-sm">
            {t('consentApproveAlreadyUsedBody')}
          </p>
        </div>
      )}

      {view.state === 'expired' && (
        <div className="mt-6 bg-white border border-[#E0DAF0] rounded-2xl p-8 shadow-sm">
          <div className="text-4xl mb-4">⏰</div>
          <h2 className="text-lg font-bold text-[#1F1733] mb-2">{t('consentApproveExpiredTitle')}</h2>
          <p className="text-[#6B618A] text-sm">
            {t('consentApproveExpiredBody')}
          </p>
        </div>
      )}

      {view.state === 'invalid' && (
        <div className="mt-6 bg-white border border-[#E0DAF0] rounded-2xl p-8 shadow-sm">
          <div className="text-4xl mb-4">🔍</div>
          <h2 className="text-lg font-bold text-[#1F1733] mb-2">{t('consentApproveInvalidTitle')}</h2>
          <p className="text-[#6B618A] text-sm">
            {t('consentApproveInvalidBody')}
          </p>
        </div>
      )}

      {view.state === 'error' && (
        <div className="mt-6 bg-white border border-[#E0DAF0] rounded-2xl p-8 shadow-sm">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-lg font-bold text-[#1F1733] mb-2">{t('acceptInviteSomethingWrong')}</h2>
          <p className="text-[#6B618A] text-sm">{view.message}</p>
          <button
            onClick={retry}
            className="mt-4 px-6 py-2 bg-[#4C6FFF] text-white text-sm font-bold rounded-lg hover:bg-[#3A52D6] transition"
          >
            {t('dashboardErrorTryAgain')}
          </button>
        </div>
      )}
    </>
  );
}

function ConsentApproveSuspenseFallback() {
  const { t } = useTranslation();
  return (
    <div className="mt-8 flex flex-col items-center gap-4">
      <span className="w-8 h-8 border-4 border-[#4C6FFF] border-t-transparent rounded-full animate-spin" />
      <p className="text-[#6B618A] text-sm">{t('accountPageLoading')}</p>
    </div>
  );
}

export default function ConsentApprovePage() {
  const { t } = useTranslation();
  return (
    <main className="min-h-screen bg-[#FAFAFF] flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <Image
          src="/mochi-base.png"
          alt={t('deleteAccountMascotAlt')}
          width={128}
          height={128}
          priority
          className="mx-auto mb-4 h-28 w-28 object-contain"
        />
        <h1 className="text-2xl font-extrabold text-[#1F1733] mb-2">{t('appName')}</h1>
        <Suspense fallback={<ConsentApproveSuspenseFallback />}>
          <ConsentApproveBody />
        </Suspense>
      </div>
    </main>
  );
}
