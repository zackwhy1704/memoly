'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { clearAuth } from '@/lib/auth';
import { api } from '@/lib/api';
import { useOrg } from '@/lib/org-context';

export default function SettingsPage() {
  const router = useRouter();
  const org = useOrg();

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

      {/* Invite students — enroll code */}
      {org && <InvitePanel orgId={org.orgId} />}

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

function InvitePanel({ orgId }: { orgId: string }) {
  const [label, setLabel] = useState('Members');
  const [seats, setSeats] = useState(30);
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function mint() {
    setLoading(true);
    setError('');
    try {
      const res = await api.mintEnrollCode(orgId, label.trim() || 'Members', seats);
      setCode(res.data.code);
    } catch {
      setError('Could not generate a code. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-panel border border-line rounded-2xl p-6 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-ink">Invite students</h2>
        <p className="text-ink3 text-xs mt-1">
          Generate a code students enter in the Memoly app to join your centre. Then assign them to a
          class from the Classes page.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs text-ink2 font-medium">Label</span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-lg border border-line bg-panel2 text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
          />
        </label>
        <label className="block">
          <span className="text-xs text-ink2 font-medium">Seats</span>
          <input
            type="number"
            min={1}
            max={500}
            value={seats}
            onChange={(e) => setSeats(Math.max(1, Math.min(500, Number(e.target.value) || 1)))}
            className="mt-1 w-full px-3 py-2 rounded-lg border border-line bg-panel2 text-ink text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
          />
        </label>
      </div>

      {error && <p className="text-xs text-bad">{error}</p>}

      {code ? (
        <div className="flex items-center justify-between bg-panel2 rounded-lg px-4 py-3">
          <span className="font-mono text-xl font-bold tracking-widest text-accent">{code}</span>
          <button onClick={() => setCode(null)} className="text-xs text-ink3 hover:text-ink">
            New code
          </button>
        </div>
      ) : (
        <button
          onClick={mint}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
        >
          {loading ? 'Generating…' : 'Generate join code'}
        </button>
      )}
    </div>
  );
}
