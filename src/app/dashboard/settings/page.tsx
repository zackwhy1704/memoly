'use client';

import Link from 'next/link';
import { logout } from '@/lib/auth';
import { useOrg } from '@/lib/org-context';

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

      {/* Invite students — one code per class, shown on the Classes page */}
      <InvitePanel />

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
