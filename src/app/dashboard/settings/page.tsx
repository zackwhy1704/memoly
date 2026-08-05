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
  const org = useOrg();

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Settings</h1>
        <p className="text-ink3 text-sm mt-1">Organisation and account settings</p>
      </div>

      <div className="bg-panel border border-line rounded-2xl p-6 space-y-5">
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-ink3 mb-2">
            Centre
          </label>
          <div className="px-3.5 py-2.5 rounded-lg border border-line bg-panel2 text-ink text-sm">
            {org?.orgName ?? '—'}
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-ink3 mb-2">
            Seats
          </label>
          <div className="px-3.5 py-2.5 rounded-lg border border-line bg-panel2 text-ink2 text-sm">
            {org ? `${org.seatsUsed} of ${org.seatLimit} used` : '—'}
          </div>
        </div>
      </div>

      <LanguagePanel />

      {/* Invite students — one code per class, shown on the Classes page */}
      <InvitePanel />

      <ReplayTourPanel />

      <div className="bg-panel border border-bad/30 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-ink mb-1">Sign out</h2>
        <p className="text-ink3 text-xs mb-4">You will be redirected to the login page.</p>
        <button
          onClick={logout}
          className="px-4 py-2 rounded-lg bg-bad/20 text-bad text-sm font-semibold
            hover:bg-bad/30 transition-colors"
        >
          Sign out
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
        setError('Something went wrong. Please try again.');
        setPhase('error');
      }
    }
  }

  if (phase === 'scheduled') {
    return (
      <div className="bg-panel border border-bad/30 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-ink mb-1">
          Account scheduled for deletion
        </h2>
        <p className="text-ink3 text-xs mb-4">
          Your account will be permanently deleted after a 14-day restore window.
          Sign back in before then to restore it.
        </p>
        <button
          onClick={logout}
          className="px-4 py-2 rounded-lg bg-bad/20 text-bad text-sm font-semibold hover:bg-bad/30 transition-colors"
        >
          Sign out
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
        <h2 className="text-sm font-semibold text-ink mb-1">Delete account</h2>
        <p className="text-ink3 text-xs">
          Permanently deletes your account. You have 14 days to restore it by
          signing back in. Confirm your password to continue.
        </p>
      </div>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Your password"
        aria-label="Password"
        className="w-full px-3.5 py-2.5 rounded-lg border border-line bg-panel2 text-ink text-sm"
      />
      {phase === 'centre' && (
        <p className="text-bad text-xs">
          Please transfer or close your centre before deleting your account — it
          still has classes, students, or staff.
        </p>
      )}
      {phase === 'error' && error && <p className="text-bad text-xs">{error}</p>}
      <button
        type="submit"
        disabled={phase === 'loading'}
        className="px-4 py-2 rounded-lg bg-bad/20 text-bad text-sm font-semibold hover:bg-bad/30 transition-colors disabled:opacity-50"
      >
        {phase === 'loading' ? 'Working…' : 'Delete my account'}
      </button>
    </form>
  );
}

function ReplayTourPanel() {
  const [armed, setArmed] = useState(false);
  return (
    <div className="bg-panel border border-line rounded-2xl p-6 space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-ink">Feature tour</h2>
        <p className="text-ink3 text-xs mt-1 leading-relaxed">
          The 60-second guided tour of the class dashboard. Replay it the next time you open a class.
        </p>
      </div>
      <button
        onClick={() => {
          resetTour();
          setArmed(true);
        }}
        className="inline-block px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:opacity-90 transition"
      >
        {armed ? 'Tour re-armed — open a class to see it' : 'Replay tour'}
      </button>
    </div>
  );
}

function InvitePanel() {
  return (
    <div className="bg-panel border border-line rounded-2xl p-6 space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-ink">Invite students</h2>
        <p className="text-ink3 text-xs mt-1 leading-relaxed">
          Every class has its own <span className="font-semibold text-ink2">join code</span>. Students
          enter it in the Apalchi app (Home → &ldquo;Got a class code?&rdquo;) to join that class — it
          adds them to your centre and gives them the class&apos;s Mochi automatically. One code per
          class, nothing else to generate.
        </p>
      </div>
      <Link
        href="/dashboard/classes"
        className="inline-block px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:opacity-90 transition"
      >
        View class codes →
      </Link>
    </div>
  );
}
