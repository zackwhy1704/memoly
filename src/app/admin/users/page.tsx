'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, AdminUser } from '@/lib/api';

const PAGE_SIZE = 200; // backend caps here

export default function AdminUsersPage() {
  const [users, setUsers]           = useState<AdminUser[]>([]);
  const [loading, setLoading]       = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [page, setPage]             = useState(0);
  const [query, setQuery]           = useState('');
  const [debounced, setDebounced]   = useState('');

  // Debounce keystrokes so we don't fire a request per character. Reset to the
  // first page whenever the search term changes.
  useEffect(() => {
    const t = setTimeout(() => { setDebounced(query.trim()); setPage(0); }, 300);
    return () => clearTimeout(t);
  }, [query]);

  // Server-side search: the backend filters by email/display name across ALL
  // users when `q` is set, so matches aren't limited to the current page.
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFetchError('');
    api.adminUsers(page, PAGE_SIZE, debounced || undefined)
      .then((res) => { if (!cancelled) setUsers(res.data); })
      .catch((err: unknown) => { if (!cancelled) setFetchError(err instanceof Error ? err.message : 'Failed to load users.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [page, debounced]);

  // Fallback client filter — keeps results correct even before the backend
  // search deploy lands (old API ignores `q` and returns an unfiltered page).
  const rows = useMemo(() => {
    const q = debounced.toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      (u.displayName ?? '').toLowerCase().includes(q) ||
      (u.email ?? '').toLowerCase().includes(q) ||
      u.userId.toLowerCase().includes(q) ||
      (u.centreId ?? '').toLowerCase().includes(q)
    );
  }, [users, debounced]);

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-ink">Users</h1>
        <p className="text-ink3 text-sm mt-1">
          {debounced
            ? `${rows.length} match${rows.length === 1 ? '' : 'es'} for “${debounced}” (searching all users)`
            : `Page ${page + 1} — ${users.length} user${users.length === 1 ? '' : 's'}`}
        </p>
      </div>

      {/* Lookup */}
      <div className="relative max-w-md">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink3 text-sm">🔍</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, email, user ID, or centre ID…"
          className="w-full pl-9 pr-3 py-2 rounded-lg border border-line text-sm bg-bg text-ink focus:outline-none focus:border-accent"
        />
      </div>

      {loading ? (
        <p className="text-ink3 text-sm">Loading…</p>
      ) : fetchError ? (
        <div className="bg-bad/10 border border-bad/30 rounded-xl p-4 text-bad text-sm max-w-xl">
          <p className="font-semibold mb-2">Could not load users</p>
          <p>{fetchError}</p>
          <button
            onClick={() => setDebounced((d) => d)}
            className="mt-3 px-3 py-1.5 bg-bad text-white rounded-lg text-xs font-semibold"
          >
            Retry
          </button>
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-surface border border-line rounded-xl p-8 text-center text-ink3 text-sm">
          {debounced ? `No users match “${debounced}”.` : 'No users found.'}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line bg-panel2 text-ink3 text-xs uppercase tracking-wider">
                <th className="text-left px-4 py-3 font-semibold">User</th>
                <th className="text-left px-4 py-3 font-semibold">Email</th>
                <th className="text-left px-4 py-3 font-semibold">Role</th>
                <th className="text-left px-4 py-3 font-semibold">Premium</th>
                <th className="text-left px-4 py-3 font-semibold">Level</th>
                <th className="text-left px-4 py-3 font-semibold">Centre</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr key={u.userId} className="border-b border-line last:border-0 hover:bg-panel2/50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-ink">{u.displayName || '—'}</p>
                    <p className="text-ink3 text-xs font-mono">{u.userId.slice(0, 8)}…</p>
                  </td>
                  <td className="px-4 py-3 text-ink2">{u.email || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${u.role === 'ADMIN' ? 'bg-accent/15 text-accent' : 'bg-panel2 text-ink3'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold ${u.isPremium ? 'text-ok' : 'text-ink3'}`}>
                      {u.isPremium ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-ink2">{u.level}</td>
                  <td className="px-4 py-3 text-ink3 text-xs font-mono">{u.centreId ? u.centreId.slice(0, 8) + '…' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination — only when browsing (no active search). */}
      {!debounced && (
        <div className="flex gap-3">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-4 py-2 rounded-lg border border-line text-sm font-semibold text-ink2 disabled:opacity-40"
          >
            Previous
          </button>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={users.length < PAGE_SIZE}
            className="px-4 py-2 rounded-lg border border-line text-sm font-semibold text-ink2 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
