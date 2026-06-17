'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, ApiError, OrgStaffMember } from '@/lib/api';
import { useOrg } from '@/lib/org-context';

export default function TeachersPage() {
  const org = useOrg();
  const qc = useQueryClient();

  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviteResult, setInviteResult] = useState<{ attached: boolean; token?: string; email: string } | null>(null);
  const [removeError, setRemoveError] = useState('');

  const staffQuery = useQuery({
    queryKey: ['staff', org?.orgId],
    queryFn: () => api.listStaff(org!.orgId),
    enabled: !!org,
  });

  const inviteMut = useMutation({
    mutationFn: (email: string) => api.inviteStaff(org!.orgId, email),
    onSuccess: (res) => {
      setInviteResult({ ...res.data });
      setInviteEmail('');
      setInviteError('');
      qc.invalidateQueries({ queryKey: ['staff', org?.orgId] });
    },
    onError: (err) => {
      setInviteError(err instanceof ApiError ? err.userMessage : 'Could not send invite.');
    },
  });

  const removeMut = useMutation({
    mutationFn: (staffUserId: string) => api.removeStaff(org!.orgId, staffUserId),
    onSuccess: () => {
      setRemoveError('');
      qc.invalidateQueries({ queryKey: ['staff', org?.orgId] });
    },
    onError: (err) => {
      setRemoveError(err instanceof ApiError ? err.userMessage : 'Could not remove staff member.');
    },
  });

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (inviteMut.isPending) return;
    setInviteResult(null);
    setInviteError('');
    inviteMut.mutate(inviteEmail.trim());
  }

  const staff: OrgStaffMember[] = staffQuery.data?.data ?? [];
  const isLoading = staffQuery.isLoading;
  const loadError = staffQuery.error;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink">Teachers</h1>
        <p className="text-ink3 text-sm mt-1">Manage staff who can access this centre&apos;s dashboard.</p>
      </div>

      {/* Current staff list */}
      <div className="bg-panel border border-line rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-line">
          <p className="text-sm font-semibold text-ink">Current staff</p>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-ink3 text-sm">Loading…</div>
        ) : loadError ? (
          <div className="p-8 text-center text-bad text-sm">
            {loadError instanceof ApiError ? loadError.userMessage : 'Could not load staff.'}
          </div>
        ) : staff.length === 0 ? (
          <div className="p-8 text-center text-ink3 text-sm">No staff yet — invite a teacher below.</div>
        ) : (
          <ul className="divide-y divide-line">
            {staff.map((s) => (
              <li key={s.userId} className="flex items-center justify-between px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-ink truncate">
                    {s.displayName || s.email}
                    {s.role === 'OWNER' && (
                      <span className="ml-2 text-xs font-normal text-ink3 bg-panel2 px-2 py-0.5 rounded-full">Owner</span>
                    )}
                  </p>
                  <p className="text-xs text-ink3 truncate mt-0.5">{s.email}</p>
                </div>
                {s.role !== 'OWNER' && (
                  <button
                    onClick={() => {
                      if (removeMut.isPending) return;
                      removeMut.mutate(s.userId);
                    }}
                    disabled={removeMut.isPending}
                    className="ml-4 text-xs text-bad hover:text-bad/80 font-semibold disabled:opacity-40 transition-colors shrink-0"
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {removeError && (
          <div className="px-5 py-3 text-sm text-bad border-t border-line">{removeError}</div>
        )}
      </div>

      {/* Invite form */}
      <div className="bg-panel border border-line rounded-2xl p-5">
        <p className="text-sm font-semibold text-ink mb-4">Invite a teacher</p>
        <form onSubmit={handleInvite} className="flex gap-3">
          <input
            type="email"
            required
            placeholder="teacher@school.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-panel2 border border-line text-ink text-sm placeholder:text-ink3 focus:outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={inviteMut.isPending || !inviteEmail.trim()}
            className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold disabled:opacity-50 transition-colors hover:bg-accent/80 shrink-0"
          >
            {inviteMut.isPending ? 'Sending…' : 'Invite'}
          </button>
        </form>

        {inviteError && (
          <p className="mt-3 text-sm text-bad">{inviteError}</p>
        )}

        {inviteResult && (
          <div className="mt-4 p-4 bg-ok/10 border border-ok/30 rounded-xl">
            {inviteResult.attached ? (
              <p className="text-sm text-ok font-semibold">
                ✓ {inviteResult.email} was already registered and has been added to your centre.
              </p>
            ) : (
              <>
                <p className="text-sm text-ok font-semibold mb-2">
                  ✓ Invite sent to {inviteResult.email}
                </p>
                {inviteResult.token && (
                  <div className="mt-2">
                    <p className="text-xs text-ink2 mb-1">Share this accept link with them:</p>
                    <code className="block text-xs text-ink bg-panel2 px-3 py-2 rounded-lg break-all select-all">
                      {typeof window !== 'undefined' ? window.location.origin : ''}/accept-invite/{inviteResult.token}
                    </code>
                    <p className="text-xs text-ink3 mt-1">Expires in 7 days.</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <p className="mt-4 text-xs text-ink3">
          If the email belongs to an existing Apalchi user, they&apos;re added immediately. Otherwise an
          invite link is generated — they click it after signing up to join your centre.
        </p>
      </div>
    </div>
  );
}
