'use client';

import { useEffect, useState } from 'react';
import { api, Avatar, UsageToday } from '@/lib/api';
import AvatarCard from '@/components/AvatarCard';
import Link from 'next/link';

export default function DashboardPage() {
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [usage, setUsage] = useState<UsageToday | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.avatars(),
      api.usageToday().catch(() => null),
    ])
      .then(([avatarRes, usageRes]) => {
        setAvatars(avatarRes.data ?? []);
        if (usageRes) setUsage(usageRes.data);
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : 'Failed to load';
        setError(msg.includes('401') ? 'Session expired — please sign in again.' : msg);
      })
      .finally(() => setLoading(false));
  }, []);

  const centreAvatars = avatars.filter((a) => a.centreManaged);
  const personalAvatars = avatars.filter((a) => !a.centreManaged);
  const totalPages = avatars.reduce((s, a) => s + (a.wikiPageCount ?? 0), 0);

  return (
    <div className="max-w-5xl">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your Mochi tutors and centre content</p>
        </div>
        <Link href="/dashboard/upload"
          className="px-4 py-2 rounded-lg bg-[#7042ED] text-white text-sm font-semibold hover:bg-[#5a35c4] transition-colors shrink-0">
          + Upload Content
        </Link>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Mochis', value: avatars.length },
          { label: 'Centre Mochis', value: centreAvatars.length },
          { label: 'Wiki Pages', value: totalPages },
          { label: usage ? `${usage.subscriptionTier} tier` : 'Tier',
            value: usage ? (usage.chatLimit === -1 ? '∞ chats' : `${usage.chatRemaining} left`) : '—' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-2xl font-bold text-[#7042ED]">{stat.value}</p>
            <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 mb-6">{error}</div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => <div key={i} className="bg-white rounded-xl border border-gray-100 h-48 animate-pulse" />)}
        </div>
      ) : (
        <>
          {centreAvatars.length > 0 && (
            <section className="mb-10">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">🏫</span>
                <h2 className="text-lg font-semibold text-gray-900">Centre Mochis</h2>
                <span className="px-2 py-0.5 bg-teal-100 text-teal-700 text-xs font-semibold rounded-full">{centreAvatars.length}</span>
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Closed-book tutors provisioned for your centre. Upload content here to grow their knowledge base. Students join via the Memoly app.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {centreAvatars.map(a => <AvatarCard key={a.id} avatar={a} />)}
              </div>
            </section>
          )}

          {personalAvatars.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">👤</span>
                <h2 className="text-lg font-semibold text-gray-900">Personal Mochis</h2>
                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">{personalAvatars.length}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {personalAvatars.map(a => <AvatarCard key={a.id} avatar={a} />)}
              </div>
            </section>
          )}

          {avatars.length === 0 && !error && (
            <div className="text-center py-24 text-gray-400">
              <p className="text-5xl mb-4">🐾</p>
              <p className="font-medium">No Mochis yet</p>
              <p className="text-sm mt-1">Create one in the Memoly app first.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
