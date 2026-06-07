'use client';

import { useRouter } from 'next/navigation';
import { clearAuth } from '@/lib/auth';

const DEMO_ORG_ID = process.env.NEXT_PUBLIC_DEMO_ORG_ID ?? 'demo';

export default function SettingsPage() {
  const router = useRouter();

  function handleSignOut() {
    clearAuth();
    router.replace('/login');
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Settings</h1>
        <p className="text-ink3 text-sm mt-1">Organisation and account settings</p>
      </div>

      <div className="bg-panel border border-line rounded-2xl p-6 space-y-5">
        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-ink3 mb-2">
            Organisation ID
          </label>
          <div className="px-3.5 py-2.5 rounded-lg border border-line bg-panel2 text-ink text-sm font-mono">
            {DEMO_ORG_ID}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium uppercase tracking-wider text-ink3 mb-2">
            Platform
          </label>
          <div className="px-3.5 py-2.5 rounded-lg border border-line bg-panel2 text-ink2 text-sm">
            Memoly Centre Admin · Powered by Pally AI
          </div>
        </div>
      </div>

      <div className="bg-panel border border-bad/30 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-ink mb-1">Sign out</h2>
        <p className="text-ink3 text-xs mb-4">You will be redirected to the login page.</p>
        <button
          onClick={handleSignOut}
          className="px-4 py-2 rounded-lg bg-bad/20 text-bad text-sm font-semibold
            hover:bg-bad/30 transition-colors"
        >
          Sign out
        </button>
      </div>
    </div>
  );
}
