'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, LeadRow, ApiError } from '@/lib/api';

const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-panel2 text-ink3',
  CONTACTED: 'bg-blue-100 text-blue-700',
  PILOT_ACTIVE: 'bg-teal-100 text-teal-700',
  CLOSED_WON: 'bg-green-100 text-green-700',
  CLOSED_LOST: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-orange-100 text-orange-700',
};

const ALL_STATUSES = ['NEW', 'CONTACTED', 'PILOT_ACTIVE', 'CLOSED_WON', 'CLOSED_LOST', 'EXPIRED'];

function StatusChip({ status }: { status: string }) {
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[status] ?? 'bg-panel2 text-ink3'}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function ProvisionModal({
  lead,
  onClose,
  onDone,
}: {
  lead: LeadRow;
  onClose: () => void;
  onDone: () => void;
}) {
  const [orgId, setOrgId] = useState(lead.orgId ?? '');
  const [tier, setTier] = useState('CENTRE');
  const [classLimit, setClassLimit] = useState(3);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleProvision() {
    if (saving) return;
    if (!orgId.trim()) { setError('Org ID is required.'); return; }
    setError('');
    setSaving(true);
    try {
      await api.adminProvisionPilot(lead.id, { orgId: orgId.trim(), tier, classLimit });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.userMessage : 'Failed to provision pilot.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100, padding: 24,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-surface rounded-2xl border border-line p-6 w-full max-w-sm space-y-4 shadow-xl">
        <h2 className="font-bold text-ink text-lg">Provision Pilot</h2>
        <p className="text-ink3 text-sm">Org: <span className="font-semibold text-ink">{lead.orgName}</span></p>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-ink2 block mb-1">Org ID</label>
            <input
              type="text"
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              placeholder="org_..."
              className="w-full px-3 py-2 rounded-lg border border-line text-sm bg-bg text-ink focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-ink2 block mb-1">Tier</label>
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-line text-sm bg-bg text-ink focus:outline-none focus:border-accent"
            >
              <option value="SOLO">SOLO</option>
              <option value="CENTRE">CENTRE</option>
              <option value="SCHOOL">SCHOOL</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-ink2 block mb-1">Class Limit</label>
            <input
              type="number"
              min={1}
              value={classLimit}
              onChange={(e) => setClassLimit(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-line text-sm bg-bg text-ink focus:outline-none focus:border-accent"
            />
          </div>
        </div>

        {error && <p className="text-bad text-sm">{error}</p>}

        <div className="flex gap-3 justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-line text-sm font-semibold text-ink2 hover:bg-panel2 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleProvision}
            disabled={saving}
            className="px-4 py-2 bg-accent text-white rounded-lg text-sm font-semibold disabled:opacity-50"
          >
            {saving ? 'Provisioning…' : 'Provision'}
          </button>
        </div>
      </div>
    </div>
  );
}

function LeadRow_({
  lead,
  onRefresh,
}: {
  lead: LeadRow;
  onRefresh: () => void;
}) {
  const [editingStatus, setEditingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState(lead.status);
  const [notes, setNotes] = useState(lead.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [showProvision, setShowProvision] = useState(false);

  async function handleSaveStatus() {
    if (saving) return;
    setSaveError('');
    setSaving(true);
    try {
      await api.adminUpdateLeadStatus(lead.id, newStatus, notes || undefined);
      setEditingStatus(false);
      onRefresh();
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.userMessage : 'Failed to update status.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {showProvision && (
        <ProvisionModal
          lead={lead}
          onClose={() => setShowProvision(false)}
          onDone={() => { setShowProvision(false); onRefresh(); }}
        />
      )}

      <tr className="border-b border-line hover:bg-panel2/50 transition-colors">
        <td className="px-4 py-3 text-sm font-semibold text-ink">{lead.orgName}</td>
        <td className="px-4 py-3 text-sm text-ink2">{lead.contactName}</td>
        <td className="px-4 py-3 text-sm text-ink2">{lead.email}</td>
        <td className="px-4 py-3 text-sm text-ink3">{lead.segment}</td>
        <td className="px-4 py-3 text-sm text-ink3 tabular-nums">{lead.estClasses ?? '—'}</td>
        <td className="px-4 py-3 text-sm text-ink3 tabular-nums">{lead.estStudents ?? '—'}</td>
        <td className="px-4 py-3">
          <StatusChip status={lead.status} />
        </td>
        <td className="px-4 py-3 text-xs text-ink3 whitespace-nowrap">
          {new Date(lead.createdAt).toLocaleDateString()}
        </td>
        <td className="px-4 py-3">
          <div className="flex flex-col gap-1.5 items-start">
            {editingStatus ? (
              <div className="flex flex-col gap-1.5 min-w-[160px]">
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-2 py-1 rounded-lg border border-line text-xs bg-bg text-ink focus:outline-none focus:border-accent"
                >
                  {ALL_STATUSES.map((s) => (
                    <option key={s} value={s}>{s.replace('_', ' ')}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Notes (optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-2 py-1 rounded-lg border border-line text-xs bg-bg text-ink focus:outline-none focus:border-accent"
                />
                {saveError && <p className="text-bad text-xs">{saveError}</p>}
                <div className="flex gap-1.5">
                  <button
                    onClick={handleSaveStatus}
                    disabled={saving}
                    className="px-2 py-1 bg-accent text-white rounded text-xs font-semibold disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    onClick={() => { setEditingStatus(false); setNewStatus(lead.status); }}
                    className="px-2 py-1 border border-line rounded text-xs font-semibold text-ink2 hover:bg-panel2"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setEditingStatus(true)}
                className="text-xs text-accent font-semibold hover:underline"
              >
                Update status
              </button>
            )}
            <button
              onClick={() => setShowProvision(true)}
              className="text-xs text-ink2 font-semibold hover:underline"
            >
              Provision pilot
            </button>
            {lead.orgId && (
              <Link
                href={`/admin/leads/orgs/${lead.orgId}`}
                className="text-xs text-ink3 font-semibold hover:underline"
              >
                View org →
              </Link>
            )}
          </div>
        </td>
      </tr>
    </>
  );
}

export default function AdminLeadsPage() {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await api.adminListLeads();
      setLeads(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.userMessage : 'Failed to load leads.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-ink3 text-sm py-8">
        <span className="animate-pulse text-2xl">📋</span>
        <span>Loading leads…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-bad/10 border border-bad/30 rounded-xl p-4 text-bad text-sm max-w-xl">
        <p className="font-semibold mb-2">Could not load leads</p>
        <p>{error}</p>
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
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Leads</h1>
          <p className="text-ink3 text-sm mt-1">{leads.length} leads total</p>
        </div>
        <button
          onClick={load}
          className="px-3 py-1.5 border border-line rounded-lg text-sm font-semibold text-ink2 hover:bg-panel2 transition-colors"
        >
          Refresh
        </button>
      </div>

      {leads.length === 0 ? (
        <div className="bg-surface border border-line rounded-2xl p-10 text-center">
          <p className="text-3xl mb-3">📋</p>
          <p className="text-ink2 font-semibold">No leads yet</p>
          <p className="text-ink3 text-sm mt-1">Demo form submissions will appear here.</p>
        </div>
      ) : (
        <div className="bg-surface border border-line rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-line bg-panel2">
                  <th className="px-4 py-3 text-left text-xs font-bold text-ink2 uppercase tracking-wide">Org</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-ink2 uppercase tracking-wide">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-ink2 uppercase tracking-wide">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-ink2 uppercase tracking-wide">Segment</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-ink2 uppercase tracking-wide">Classes</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-ink2 uppercase tracking-wide">Students</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-ink2 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-ink2 uppercase tracking-wide">Created</th>
                  <th className="px-4 py-3 text-left text-xs font-bold text-ink2 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <LeadRow_ key={lead.id} lead={lead} onRefresh={load} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
