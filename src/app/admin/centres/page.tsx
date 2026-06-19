'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api, AdminOrg, AdminInvite } from '@/lib/api';

export default function AdminCentresPage() {
  const [orgs, setOrgs]         = useState<AdminOrg[]>([]);
  const [invites, setInvites]   = useState<AdminInvite[]>([]);
  const [loading, setLoading]   = useState(true);

  const [fetchError, setFetchError]     = useState('');
  const [centreName, setCentreName]     = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [creating, setCreating]         = useState(false);
  const [createError, setCreateError]   = useState('');
  const [createdToken, setCreatedToken] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setFetchError('');
    try {
      const [o, i] = await Promise.all([api.adminOrgs(), api.adminInvites()]);
      setOrgs(o.data);
      setInvites(i.data);
    } catch (err: unknown) {
      setFetchError(err instanceof Error ? err.message : 'Failed to load centres and invites.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleCreateInvite(e: FormEvent) {
    e.preventDefault();
    if (creating) return;
    setCreateError('');
    setCreatedToken(null);
    setCreating(true);
    try {
      const res = await api.adminCreateInvite(centreName, contactEmail);
      setCreatedToken(res.data.token);
      setCentreName('');
      setContactEmail('');
      const fresh = await api.adminInvites();
      setInvites(fresh.data);
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create invite.');
    } finally {
      setCreating(false);
    }
  }

  const inviteLink = (token: string) =>
    `${typeof window !== 'undefined' ? window.location.origin : ''}/accept-invite/${token}`;

  if (loading) {
    return <p className="text-ink3 text-sm">Loading…</p>;
  }

  if (fetchError) {
    return (
      <div className="bg-bad/10 border border-bad/30 rounded-xl p-4 text-bad text-sm max-w-xl">
        <p className="font-semibold mb-2">Could not load centres</p>
        <p>{fetchError}</p>
        <button
          onClick={load}
          className="mt-3 px-3 py-1.5 bg-bad text-white rounded-lg text-xs font-semibold"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-ink">Centres</h1>
        <p className="text-ink3 text-sm mt-1">{orgs.length} organisations registered.</p>
      </div>

      {/* Create invite */}
      <div className="bg-surface border border-line rounded-2xl p-6 space-y-4">
        <h2 className="font-bold text-ink">Create centre invite</h2>
        <form onSubmit={handleCreateInvite} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="Centre name"
            required
            value={centreName}
            onChange={(e) => setCentreName(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg border border-line text-sm bg-bg text-ink focus:outline-none focus:border-accent"
          />
          <input
            type="email"
            placeholder="Contact email"
            required
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg border border-line text-sm bg-bg text-ink focus:outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={creating}
            className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-semibold disabled:opacity-50"
          >
            {creating ? 'Creating…' : 'Create invite'}
          </button>
        </form>
        {createError && <p className="text-bad text-sm">{createError}</p>}
        {createdToken && (
          <div className="bg-ok/10 border border-ok/30 rounded-xl p-4 text-sm space-y-1">
            <p className="font-semibold text-ok">Invite created — share this link:</p>
            <p className="text-ink2 break-all font-mono text-xs">{inviteLink(createdToken)}</p>
          </div>
        )}
      </div>

      {/* Existing orgs */}
      <div className="space-y-3">
        <h2 className="font-bold text-ink">Registered centres ({orgs.length})</h2>
        {orgs.length === 0 && <p className="text-ink3 text-sm">No centres yet.</p>}
        {orgs.map((org) => (
          <div key={org.id} className="bg-surface border border-line rounded-xl px-5 py-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-ink text-sm">{org.name}</p>
              <p className="text-ink3 text-xs mt-0.5">ID: {org.id} · seats: {org.seatLimit}</p>
            </div>
            <span className="text-ink3 text-xs">{new Date(org.createdAt).toLocaleDateString()}</span>
          </div>
        ))}
      </div>

      {/* Pending invites */}
      <div className="space-y-3">
        <h2 className="font-bold text-ink">Invites</h2>
        {invites.length === 0 && <p className="text-ink3 text-sm">No invites yet.</p>}
        {invites.map((inv) => (
          <div
            key={inv.token}
            className={`bg-surface border rounded-xl px-5 py-4 ${inv.acceptedAt ? 'border-ok/40' : 'border-line'}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-ink text-sm">{inv.centreName}</p>
                <p className="text-ink3 text-xs mt-0.5">{inv.contactEmail}</p>
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${inv.acceptedAt ? 'bg-ok/15 text-ok' : 'bg-warn/15 text-warn'}`}>
                {inv.acceptedAt ? 'Accepted' : 'Pending'}
              </span>
            </div>
            {!inv.acceptedAt && (
              <p className="text-ink3 text-xs mt-2 font-mono break-all">{inviteLink(inv.token)}</p>
            )}
            {inv.acceptedAt && (
              <p className="text-ink3 text-xs mt-1">Org: {inv.orgId}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
