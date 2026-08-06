'use client';

import Link from 'next/link';
import { useState } from 'react';
import { logout } from '@/lib/auth';
import { apiFetch, ApiError } from '@/lib/api';
import { useOrg } from '@/lib/org-context';
import { useLocale } from '@/lib/locale';
import { useTranslation } from '@/lib/messages';
import { APP_LANGUAGES } from '@/lib/app-languages';
import { resetTour } from '@/app/dashboard/classes/[classId]/tourStorage';

export default function SettingsPage() {
  const { t, tp } = useTranslation();
  const org = useOrg();

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">{t('settingsPageHeading')}</h1>
        <p className="text-ink3 text-sm mt-1">{t('settingsPageSubtitle')}</p>
      </div>

      <div className="bg-panel border border-line rounded-2xl p-6 space-y-5">
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-ink3 mb-2">
            {t('settingsPageCentreLabel')}
          </label>
          <div className="px-3.5 py-2.5 rounded-lg border border-line bg-panel2 text-ink text-sm">
            {org?.orgName ?? '—'}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-ink3 mb-2">
            {t('settingsPageSeatsLabel')}
          </label>
          <div className="px-3.5 py-2.5 rounded-lg border border-line bg-panel2 text-ink2 text-sm">
            {org ? tp.settingsPageSeatsUsed(org.seatsUsed, org.seatLimit) : '—'}
          </div>
        </div>
      </div>

      <LanguagePanel />

      {/* Invite students — one code per class, shown on the Classes page */}
      <InvitePanel />

      <ReplayTourPanel />

      <div className="bg-panel border border-bad/30 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-ink mb-1">{t('settingsPageSignOut')}</h2>
        <p className="text-ink3 text-xs mb-4">{t('settingsPageSignOutBody')}</p>
        <button
          onClick={logout}
          className="px-4 py-2 rounded-lg bg-bad/20 text-bad text-sm font-semibold
            hover:bg-bad/30 transition-colors"
        >
          {t('settingsPageSignOut')}
        </button>
      </div>

      <DeleteAccountPanel />
    </div>
  );
}

function LanguagePanel() {
  const { language, setLanguage } = useLocale();
  const { t } = useTranslation();

  return (
    <div className="bg-panel border border-line rounded-2xl p-6 space-y-3">
      <label className="block text-xs font-medium uppercase tracking-wider text-ink3 mb-2">
        {t('settingsLanguageLabel')}
      </label>
      <div className="flex gap-2" role="group" aria-label={t('settingsLanguageLabel')}>
        {APP_LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            type="button"
            onClick={() => setLanguage(lang.code)}
            aria-pressed={language.code === lang.code}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors border ${
              language.code === lang.code
                ? 'bg-accent text-white border-accent'
                : 'bg-panel2 text-ink2 border-line hover:border-accent'
            }`}
          >
            {lang.endonym}
          </button>
        ))}
      </div>
    </div>
  );
}

function DeleteAccountPanel() {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [phase, setPhase] = useState<
    'idle' | 'loading' | 'scheduled' | 'centre' | 'error'
  >('idle');
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!password || phase === 'loading') return;
    setPhase('loading');
    setError(null);
    try {
      await apiFetch('/account/delete', {
        method: 'POST',
        body: JSON.stringify({ password }),
        // A wrong-password 401 here must render inline, not clear the session.
        noAuthRedirect: true,
      });
      setPhase('scheduled');
    } catch (err) {
      if (err instanceof ApiError && err.code === 'CENTRE_NOT_EMPTY') {
        setPhase('centre');
      } else if (err instanceof ApiError) {
        setError(err.userMessage);
        setPhase('error');
      } else {
        setError(t('answerReleaseErrorFallback'));
        setPhase('error');
      }
    }
  }

  if (phase === 'scheduled') {
    return (
      <div className="bg-panel border border-bad/30 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-ink mb-1">
          {t('settingsPageAccountScheduledTitle')}
        </h2>
        <p className="text-ink3 text-xs mb-4">
          {t('settingsPageAccountScheduledBody')}
        </p>
        <button
          onClick={logout}
          className="px-4 py-2 rounded-lg bg-bad/20 text-bad text-sm font-semibold hover:bg-bad/30 transition-colors"
        >
          {t('settingsPageSignOut')}
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="bg-panel border border-bad/30 rounded-2xl p-6 space-y-3"
    >
      <div>
        <h2 className="text-sm font-semibold text-ink mb-1">{t('settingsPageDeleteAccountHeading')}</h2>
        <p className="text-ink3 text-xs">
          {t('settingsPageDeleteAccountBody')}
        </p>
      </div>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder={t('settingsPagePasswordPlaceholder')}
        aria-label={t('settingsPagePasswordAriaLabel')}
        className="w-full px-3.5 py-2.5 rounded-lg border border-line bg-panel2 text-ink text-sm"
      />
      {phase === 'centre' && (
        <p className="text-bad text-xs">
          {t('settingsPageCentreNotEmptyError')}
        </p>
      )}
      {phase === 'error' && error && <p className="text-bad text-xs">{error}</p>}
      <button
        type="submit"
        disabled={phase === 'loading'}
        className="px-4 py-2 rounded-lg bg-bad/20 text-bad text-sm font-semibold hover:bg-bad/30 transition-colors disabled:opacity-50"
      >
        {phase === 'loading' ? t('createClassModalWorking') : t('settingsPageDeleteMyAccount')}
      </button>
    </form>
  );
}

function ReplayTourPanel() {
  const { t } = useTranslation();
  const [armed, setArmed] = useState(false);
  return (
    <div className="bg-panel border border-line rounded-2xl p-6 space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-ink">{t('tourAriaLabel')}</h2>
        <p className="text-ink3 text-xs mt-1 leading-relaxed">
          {t('settingsPageFeatureTourBody')}
        </p>
      </div>
      <button
        onClick={() => {
          resetTour();
          setArmed(true);
        }}
        className="inline-block px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:opacity-90 transition"
      >
        {armed ? t('settingsPageTourRearmed') : t('settingsPageReplayTour')}
      </button>
    </div>
  );
}

function InvitePanel() {
  const { t } = useTranslation();
  return (
    <div className="bg-panel border border-line rounded-2xl p-6 space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-ink">{t('settingsPageInviteStudentsHeading')}</h2>
        <p className="text-ink3 text-xs mt-1 leading-relaxed">
          {t('settingsPageInvitePrefix')}<span className="font-semibold text-ink2">{t('classDetailJoinCodeBold')}</span>{t('settingsPageInviteMid')}{t('classDetailGotClassCodeBold')}{t('settingsPageInviteSuffix')}
        </p>
      </div>
      <Link
        href="/dashboard/classes"
        className="inline-block px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:opacity-90 transition"
      >
        {t('settingsPageViewClassCodes')}
      </Link>
    </div>
  );
}
