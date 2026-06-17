'use client';

import { useEffect, useState } from 'react';
import { api, AdminUser } from '@/lib/api';

export default function AdminUsersPage() {
  const [users, setUsers]     = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage]       = useState(0);

  useEffect(() => {
    setLoading(true);
    api.adminUsers(page, 50)
      .then((res) => setUsers(res.data))
      .finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-ink">Users</h1>
        <p className="text-ink3 text-sm mt-1">Page {page + 1} — showing up to 50 users.</p>
      </div>

      {loading ? (
        <p className="text-ink3 text-sm">Loading…</p>
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
              {users.map((u) => (
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
          disabled={users.length < 50}
          className="px-4 py-2 rounded-lg border border-line text-sm font-semibold text-ink2 disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
