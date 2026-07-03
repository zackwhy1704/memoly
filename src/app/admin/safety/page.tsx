'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, type SafetyFlagDto } from '@/lib/api';
import AsyncBoundary from '@/components/AsyncBoundary';

export default function AdminSafetyPage() {
  const [userId, setUserId] = useState('');
  const [sinceHours, setSinceHours] = useState(24);
  // In-memory only (React state) — NOT sessionStorage, which is readable by any
  // JS/XSS. The secret is re-entered each page load rather than persisted.
  // TODO: replace this shared secret with an ADMIN JWT-claim check server-side.
  const [secret, setSecret] = useState('');
  const [secretInput, setSecretInput] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const query = useQuery({
    queryKey: ['safetyFlags', userId, sinceHours, secret],
    queryFn: () => api.getSafetyFlags(userId, sinceHours, secret),
    enabled: submitted && !!userId && !!secret,
    retry: false,
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const s = secretInput.trim();
    if (s) {
      setSecret(s); // in-memory only — not persisted to storage
    }
    setSubmitted(true);
  }

  const is403 =
    query.isError &&
    (query.error as { status?: number })?.status === 403;

  function severityClass(severity: string) {
    if (severity === 'HIGH') return 'bg-bad/15 text-bad';
    if (severity === 'MEDIUM') return 'bg-warn/15 text-warn';
    return 'bg-panel2 text-ink2';
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-ink">Safety Flag Review</h1>

      <form onSubmit={handleSubmit} className="bg-surface border border-line rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-ink3 mb-1">Child User ID</label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="user-abc123"
              required
              className="w-full border border-line rounded-lg px-3 py-2 text-sm bg-bg text-ink focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink3 mb-1">Window (hours)</label>
            <input
              type="number"
              value={sinceHours}
              onChange={(e) => setSinceHours(Number(e.target.value))}
              min={1}
              max={720}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm bg-bg text-ink focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>
        </div>

        {!secret && (
          <div>
            <label className="block text-xs font-semibold text-ink3 mb-1">Admin Secret</label>
            <input
              type="password"
              value={secretInput}
              onChange={(e) => setSecretInput(e.target.value)}
              placeholder="Enter admin secret"
              required
              autoComplete="off"
              className="w-full border border-line rounded-lg px-3 py-2 text-sm bg-bg text-ink focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
          </div>
        )}

        <button
          type="submit"
          className="px-4 py-2 bg-accent text-white text-sm font-semibold rounded-lg hover:bg-accent/80 transition"
        >
          Load flags
        </button>
      </form>

      {is403 && (
        <div className="bg-bad/10 border border-bad/30 rounded-xl px-5 py-4 text-sm text-bad font-medium">
          Invalid admin secret.
        </div>
      )}

      {submitted && !!userId && !!secret && !is403 && (
        <AsyncBoundary
          query={query}
          loadingIcon="🔍"
          loadingLabel="Loading safety flags…"
          errorMessage="Could not load safety flags."
        >
          {(res) => {
            const flags = (res as { data: SafetyFlagDto[] }).data ?? [];
            if (flags.length === 0) {
              return (
                <div className="bg-surface border border-line rounded-xl p-8 text-center text-ink3 text-sm">
                  No flags found for this user in the last {sinceHours} hours.
                </div>
              );
            }
            return (
              <div className="bg-surface border border-line rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-panel2 border-b border-line">
                    <tr>
                      {['Timestamp', 'Category', 'Severity', 'Source', 'Snippet'].map((h) => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-ink3 uppercase tracking-wide">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {flags.map((f) => (
                      <tr key={f.id} className="hover:bg-panel2/50">
                        <td className="px-4 py-3 text-ink2 whitespace-nowrap font-mono text-xs">
                          {new Date(f.createdAt).toLocaleString()}
                        </td>
                        <td className="px-4 py-3 text-ink font-medium">{f.category}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${severityClass(f.severity)}`}>
                            {f.severity}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-ink2">{f.source}</td>
                        <td className="px-4 py-3 text-ink max-w-xs truncate" title={f.snippet ?? ''}>
                          {f.snippet ?? <span className="text-ink3 italic">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }}
        </AsyncBoundary>
      )}
    </div>
  );
}
