'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, type SafetyFlagDto } from '@/lib/api';
import AsyncBoundary from '@/components/AsyncBoundary';

export default function AdminSafetyPage() {
  const [userId, setUserId] = useState('');
  const [sinceHours, setSinceHours] = useState(24);
  const [secret, setSecret] = useState(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('adminSecret') ?? '';
    }
    return '';
  });
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
      sessionStorage.setItem('adminSecret', s);
      setSecret(s);
    }
    setSubmitted(true);
  }

  const is403 =
    query.isError &&
    (query.error as { status?: number })?.status === 403;

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Safety Flag Review</h1>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-500 mb-1">Child User ID</label>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="user-abc123"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Window (hours)</label>
              <input
                type="number"
                value={sinceHours}
                onChange={(e) => setSinceHours(Number(e.target.value))}
                min={1}
                max={720}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {!secret && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Admin Secret</label>
              <input
                type="password"
                value={secretInput}
                onChange={(e) => setSecretInput(e.target.value)}
                placeholder="Enter admin secret"
                required
                autoComplete="off"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          )}

          <button
            type="submit"
            className="px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-lg hover:bg-purple-700 transition"
          >
            Load flags
          </button>
        </form>

        {is403 && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 text-sm text-red-700 font-medium">
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
                  <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
                    No flags found for this user in the last {sinceHours} hours.
                  </div>
                );
              }
              return (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        {['Timestamp', 'Category', 'Severity', 'Source', 'Snippet'].map((h) => (
                          <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {flags.map((f) => (
                        <tr key={f.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-600 whitespace-nowrap font-mono text-xs">
                            {new Date(f.createdAt).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-gray-800 font-medium">{f.category}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                              f.severity === 'HIGH'
                                ? 'bg-red-100 text-red-700'
                                : f.severity === 'MEDIUM'
                                ? 'bg-orange-100 text-orange-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {f.severity}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">{f.source}</td>
                          <td className="px-4 py-3 text-gray-700 max-w-xs truncate" title={f.snippet ?? ''}>
                            {f.snippet ?? <span className="text-gray-400 italic">—</span>}
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
    </main>
  );
}
