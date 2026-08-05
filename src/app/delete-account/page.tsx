'use client';

import { Suspense, useState } from 'react';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { apiFetch, ApiError } from '@/lib/api';
import { useTranslation } from '@/lib/messages';

type View =
  | { state: 'email_entry' }
  | { state: 'email_sent' }
  | { state: 'rate_limited' }
  | { state: 'confirm' }
  | { state: 'loading' }
  | { state: 'scheduled'; graceEndsAt: string | null }
  | { state: 'centre_not_empty' }
  | { state: 'invalid_or_expired' }
  | { state: 'error'; message: string };

const CARD = 'mt-6 bg-white border border-[#E0DAF0] rounded-2xl p-8 shadow-sm text-left';

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function DeleteAccountBody() {
  const { t, tp } = useTranslation();
  const params = useSearchParams();
  const token = params.get('token');
  const [email, setEmail] = useState('');
  // A token in the URL → the confirm step (human-confirm, never auto-fire the
  // state-changing POST — link scanners fetch but don't click). No token → the
  // email-entry step for the public "request deletion by email" flow.
  const [view, setView] = useState<View>({
    state: token ? 'confirm' : 'email_entry',
  });

  function requestByEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setView({ state: 'loading' });
    apiFetch('/account/delete/request-by-email', {
      method: 'POST',
      body: JSON.stringify({ email: email.trim() }),
      skipAuth: true,
    })
      // NON-ENUMERATING: identical outcome whether or not an account exists.
      .then(() => setView({ state: 'email_sent' }))
      .catch((err) => {
        if (err instanceof ApiError && err.status === 429) {
          setView({ state: 'rate_limited' });
        } else {
          // Still don't reveal existence — a generic failure, retryable.
          setView({ state: 'error', message: t('deleteAccountGenericErrorFallback') });
        }
      });
  }

  function confirmDeletion() {
    if (!token) return;
    setView({ state: 'loading' });
    apiFetch<{ data?: { graceEndsAt?: string } }>('/account/delete/confirm', {
      method: 'POST',
      body: JSON.stringify({ token }),
      skipAuth: true,
    })
      .then((res) =>
        setView({
          state: 'scheduled',
          graceEndsAt: res?.data?.graceEndsAt ?? null,
        })
      )
      .catch((err) => {
        if (err instanceof ApiError && err.code === 'CENTRE_NOT_EMPTY') {
          setView({ state: 'centre_not_empty' });
        } else if (err instanceof ApiError && err.status === 400) {
          setView({ state: 'invalid_or_expired' });
        } else {
          const message =
            err instanceof ApiError
              ? err.userMessage
              : t('deleteAccountUnexpectedErrorFallback');
          setView({ state: 'error', message });
        }
      });
  }

  return (
    <>
      {view.state === 'email_entry' && (
        <form onSubmit={requestByEmail} className={CARD}>
          <h2 className="text-lg font-bold text-[#1F1733] mb-2">
            {t('deleteAccountEmailEntryHeading')}
          </h2>
          <p className="text-[#6B618A] text-sm mb-5">
            {t('deleteAccountEmailEntryBody')}
          </p>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('deleteAccountEmailPlaceholder')}
            aria-label={t('deleteAccountEmailAriaLabel')}
            className="w-full border border-[#E0DAF0] rounded-xl px-4 py-3 text-sm text-[#1F1733] mb-4 focus:outline-none focus:border-[#4C6FFF]"
          />
          <button
            type="submit"
            className="w-full bg-[#E5484D] hover:bg-[#cf3f43] text-white font-semibold rounded-xl py-3 transition"
          >
            {t('deleteAccountEmailMeButton')}
          </button>
        </form>
      )}

      {view.state === 'email_sent' && (
        <div className={CARD}>
          <h2 className="text-lg font-bold text-[#1F1733] mb-2">{t('deleteAccountCheckEmailHeading')}</h2>
          <p className="text-[#6B618A] text-sm">
            {t('deleteAccountCheckEmailBody')}
          </p>
        </div>
      )}

      {view.state === 'rate_limited' && (
        <div className={CARD}>
          <h2 className="text-lg font-bold text-[#1F1733] mb-2">{t('deleteAccountRateLimitedHeading')}</h2>
          <p className="text-[#6B618A] text-sm">
            {t('deleteAccountRateLimitedBody')}
          </p>
        </div>
      )}

      {view.state === 'confirm' && (
        <div className={CARD}>
          <h2 className="text-lg font-bold text-[#1F1733] mb-2">
            {t('deleteAccountConfirmHeading')}
          </h2>
          <p className="text-[#6B618A] text-sm mb-5">
            {t('deleteAccountConfirmBody')}
          </p>
          <button
            onClick={confirmDeletion}
            className="w-full bg-[#E5484D] hover:bg-[#cf3f43] text-white font-semibold rounded-xl py-3 transition"
          >
            {t('deleteAccountDeleteButton')}
          </button>
        </div>
      )}

      {view.state === 'loading' && (
        <div className="mt-8 flex flex-col items-center gap-4">
          <span className="w-8 h-8 border-4 border-[#4C6FFF] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#6B618A] text-sm">{t('createClassModalWorking')}</p>
        </div>
      )}

      {view.state === 'scheduled' && (
        <div className={CARD}>
          <div className="text-4xl mb-4">🗓️</div>
          <h2 className="text-lg font-bold text-[#1F1733] mb-2">
            {t('deleteAccountScheduledHeading')}
          </h2>
          <p className="text-[#6B618A] text-sm">
            {formatDate(view.graceEndsAt)
              ? tp.deleteAccountScheduledBodyWithDate(formatDate(view.graceEndsAt)!)
              : t('deleteAccountScheduledBodyNoDate')}
            {t('deleteAccountScheduledSuffix')}
          </p>
        </div>
      )}

      {view.state === 'centre_not_empty' && (
        <div className={CARD}>
          <div className="text-4xl mb-4">🏫</div>
          <h2 className="text-lg font-bold text-[#1F1733] mb-2">
            {t('deleteAccountCentreFirstHeading')}
          </h2>
          <p className="text-[#6B618A] text-sm">
            {t('deleteAccountCentreFirstBody')}
          </p>
        </div>
      )}

      {view.state === 'invalid_or_expired' && (
        <div className={CARD}>
          <div className="text-4xl mb-4">🔍</div>
          <h2 className="text-lg font-bold text-[#1F1733] mb-2">{t('deleteAccountLinkExpiredHeading')}</h2>
          <p className="text-[#6B618A] text-sm">
            {t('deleteAccountLinkExpiredBody')}
          </p>
        </div>
      )}

      {view.state === 'error' && (
        <div className={CARD}>
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-lg font-bold text-[#1F1733] mb-2">
            {t('acceptInviteSomethingWrong')}
          </h2>
          <p className="text-[#6B618A] text-sm">{view.message}</p>
        </div>
      )}
    </>
  );
}

function DeleteAccountSuspenseFallback() {
  const { t } = useTranslation();
  return (
    <div className="mt-8 flex flex-col items-center gap-4">
      <span className="w-8 h-8 border-4 border-[#4C6FFF] border-t-transparent rounded-full animate-spin" />
      <p className="text-[#6B618A] text-sm">{t('accountPageLoading')}</p>
    </div>
  );
}

export default function DeleteAccountPage() {
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
        <Suspense fallback={<DeleteAccountSuspenseFallback />}>
          <DeleteAccountBody />
        </Suspense>
      </div>
    </main>
  );
}
