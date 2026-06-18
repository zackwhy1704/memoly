'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { api, OrgBillingDetail, ApiError } from '@/lib/api';

function daysLeft(isoDate: string): number {
  return Math.max(0, Math.ceil((new Date(isoDate).getTime() - Date.now()) / 86_400_000));
}

function SubStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PILOT: 'bg-amber-100 text-amber-700',
    ACTIVE: 'bg-green-100 text-green-700',
    EXPIRED: 'bg-red-100 text-red-700',
    INACTIVE: 'bg-panel2 text-ink3',
  };
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${map[status] ?? 'bg-panel2 text-ink3'}`}>
      {status}
    </span>
  );
}

export default function OrgBillingDetailPage() {
  const { orgId } = useParams<{ orgId: string }>();
  const [detail, setDetail] = useState<OrgBillingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');

  // Activate form state
  const [billingRef, setBillingRef] = useState('');
  const [activating, setActivating] = useState(false);
  const [activateError, setActivateError] = useState('');
  const [activateSuccess, setActivateSuccess] = useState('');

  // Expire state
  const [expiring, setExpiring] = useState(false);
  const [expireError, setExpireError] = useState('');
  const [expireConfirm, setExpireConfirm] = useState(false);

  async function load() {
    setLoading(true);
    setFetchError('');
    try {
      const res = await api.adminOrgBillingDetail(orgId);
      setDetail(res.data);
    } catch (err) {
      setFetchError(err instanceof ApiError ? err.userMessage : 'Failed to load org billing detail.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [orgId]);

  async function handleActivate() {
    if (activating) return;
    if (!billingRef.trim()) { setActivateError('Billing reference is required.'); return; }
    setActivateError('');
    setActivateSuccess('');
    setActivating(true);
    try {
      await api.adminActivateOrg(orgId, billingRef.trim());
      setActivateSuccess('Org activated successfully.');
      setBillingRef('');
      await load();
    } catch (err) {
      setActivateError(err instanceof ApiError ? err.userMessage : 'Failed to activate org.');
    } finally {
      setActivating(false);
    }
  }

  async function handleExpire() {
    if (expiring) return;
    setExpireError('');
    setExpiring(true);
    try {
      await api.adminExpireOrg(orgId);
      setExpireConfirm(false);
      await load();
    } catch (err) {
      setExpireError(err instanceof ApiError ? err.userMessage : 'Failed to expire org.');
    } finally {
      setExpiring(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-ink3 text-sm py-8">
        <span className="animate-pulse text-2xl">🏢</span>
        <span>Loading org billing detail…</span>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="bg-bad/10 border border-bad/30 rounded-xl p-4 text-bad text-sm max-w-xl">
        <p className="font-semibold mb-2">Could not load org</p>
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

  if (!detail) return null;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-ink3">
        <Link href="/admin/leads" className="hover:text-ink transition-colors">Leads</Link>
        <span>/</span>
        <span className="text-ink font-semibold">{detail.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">{detail.name}</h1>
          <p className="text-ink3 text-sm mt-1">ID: {detail.orgId}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <SubStatusBadge status={detail.subStatus} />
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-panel2 text-ink2">
            {detail.tier}
          </span>
          {/* Terms badge */}
          {detail.termsAccepted ? (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-ok/15 text-ok flex items-center gap-1">
              ✓ Terms accepted
            </span>
          ) : (
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-warn/15 text-warn flex items-center gap-1">
              ⚠ Terms not accepted
            </span>
          )}
        </div>
      </div>

      {/* Pilot countdown */}
      {detail.subStatus === 'PILOT' && detail.pilotEndsAt && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-bold text-amber-800 text-sm">Pilot active</p>
            <p className="text-amber-700 text-xs mt-0.5">
              Ends {new Date(detail.pilotEndsAt).toLocaleDateString()} — {daysLeft(detail.pilotEndsAt)} days left
            </p>
          </div>
          <span className="text-3xl font-bold text-amber-600 tabular-nums">
            {daysLeft(detail.pilotEndsAt)}d
          </span>
        </div>
      )}

      {/* Usage summary */}
      <div className="bg-surface border border-line rounded-2xl p-5 space-y-4">
        <p className="text-sm font-semibold text-ink">Usage</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-panel2 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold tabular-nums text-ink">{detail.classesUsed}</p>
            <p className="text-xs text-ink3 mt-1 uppercase tracking-wide font-semibold">Classes used</p>
          </div>
          <div className="bg-panel2 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold tabular-nums text-ink">{detail.classLimit}</p>
            <p className="text-xs text-ink3 mt-1 uppercase tracking-wide font-semibold">Class limit</p>
          </div>
          <div className="bg-panel2 rounded-xl p-4 text-center">
            <p className="text-2xl font-bold tabular-nums text-ink">{detail.classStudentCap}</p>
            <p className="text-xs text-ink3 mt-1 uppercase tracking-wide font-semibold">Student cap/class</p>
          </div>
        </div>

        {/* Per-class breakdown */}
        {detail.perClass.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-ink2 uppercase tracking-wide mb-2">Per-class breakdown</p>
            <div className="space-y-2">
              {detail.perClass.map((cls) => (
                <div key={cls.classId} className="flex items-center justify-between gap-4 py-2 border-b border-line last:border-0">
                  <div>
                    <p className="text-sm font-semibold text-ink">{cls.className}</p>
                    <p className="text-xs text-ink3">{cls.classId}</p>
                  </div>
                  <span className={`text-sm font-bold tabular-nums ${cls.studentsLinked >= cls.studentCap ? 'text-bad' : 'text-ok'}`}>
                    {cls.studentsLinked}/{cls.studentCap}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Activate org */}
      <div className="bg-surface border border-line rounded-2xl p-5 space-y-3">
        <p className="text-sm font-semibold text-ink">Activate org</p>
        <p className="text-xs text-ink3">Move this org from pilot to active with a billing reference (invoice ID, Stripe subscription ID, etc.).</p>
        <div className="flex gap-3 flex-wrap">
          <input
            type="text"
            placeholder="Billing reference (e.g. inv_123456)"
            value={billingRef}
            onChange={(e) => setBillingRef(e.target.value)}
            className="flex-1 min-w-[200px] px-3 py-2 rounded-lg border border-line text-sm bg-bg text-ink focus:outline-none focus:border-accent"
          />
          <button
            onClick={handleActivate}
            disabled={activating}
            className="px-4 py-2 bg-ok text-white rounded-lg text-sm font-semibold disabled:opacity-50 hover:bg-ok/80 transition-colors"
          >
            {activating ? 'Activating…' : 'Activate org'}
          </button>
        </div>
        {activateError && <p className="text-bad text-sm">{activateError}</p>}
        {activateSuccess && <p className="text-ok text-sm font-semibold">{activateSuccess}</p>}
      </div>

      {/* Expire org */}
      <div className="bg-surface border border-line rounded-2xl p-5 space-y-3">
        <p className="text-sm font-semibold text-ink">Expire org</p>
        <p className="text-xs text-ink3">Mark this org as expired. This will disable their access.</p>
        {!expireConfirm ? (
          <button
            onClick={() => setExpireConfirm(true)}
            className="px-4 py-2 border border-bad text-bad rounded-lg text-sm font-semibold hover:bg-bad/10 transition-colors"
          >
            Expire org
          </button>
        ) : (
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-sm font-semibold text-bad">Are you sure? This will disable their access.</p>
            <button
              onClick={handleExpire}
              disabled={expiring}
              className="px-4 py-2 bg-bad text-white rounded-lg text-sm font-semibold disabled:opacity-50"
            >
              {expiring ? 'Expiring…' : 'Confirm expire'}
            </button>
            <button
              onClick={() => setExpireConfirm(false)}
              className="px-3 py-2 border border-line rounded-lg text-sm font-semibold text-ink2 hover:bg-panel2 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
        {expireError && <p className="text-bad text-sm">{expireError}</p>}
      </div>

      {/* Terms detail */}
      {detail.termsAcceptedAt && (
        <div className="text-xs text-ink3">
          Terms accepted at: {new Date(detail.termsAcceptedAt).toLocaleString()}
        </div>
      )}
    </div>
  );
}
