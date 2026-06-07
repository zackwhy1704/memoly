'use client';

import { useEffect, useState } from 'react';
import { api, Avatar } from '@/lib/api';
import AvatarCard from '@/components/AvatarCard';
import Link from 'next/link';

export default function DashboardPage() {
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .avatars()
      .then((res) => setAvatars(res.data ?? []))
      .catch((err) => {
        const msg = err instanceof Error ? err.message : 'Failed to load';
        setError(msg.includes('401') ? 'Session expired — please sign in again.' : msg);
      })
      .finally(() => setLoading(false));
  }, []);

  const totalPages = avatars.reduce((sum, a) => sum + (a.wikiPageCount ?? 0), 0);

  return (
    <div>
      {/* Page header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Overview</h1>
          <p className="text-gray-500 text-sm mt-1">Your Memoly AI tutors and their knowledge bases</p>
        </div>
        <Link
          href="/dashboard/upload"
          className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#7042ED] text-white text-sm font-semibold hover:bg-[#5a35c4] transition-colors"
        >
          <span>↑</span> Upload Content
        </Link>
      </div>

      {/* Stats bar */}
      {!loading && !error && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <p className="text-3xl font-bold text-[#7042ED]">{avatars.length}</p>
            <p className="text-sm text-gray-500 mt-1">AI Tutors</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <p className="text-3xl font-bold text-[#7042ED]">{totalPages}</p>
            <p className="text-sm text-gray-500 mt-1">Wiki Pages Total</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 col-span-2 sm:col-span-1">
            <p className="text-3xl font-bold text-gray-400">—</p>
            <p className="text-sm text-gray-500 mt-1">Active Students</p>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-24">
          <div className="flex flex-col items-center gap-3">
            <span className="text-4xl animate-bounce">🐾</span>
            <p className="text-gray-400 text-sm">Loading tutors…</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-red-700 text-sm">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Avatar grid */}
      {!loading && !error && avatars.length === 0 && (
        <div className="text-center py-24">
          <span className="text-5xl mb-4 block">🐾</span>
          <p className="text-gray-500 font-medium">No AI tutors yet</p>
          <p className="text-gray-400 text-sm mt-1">Create a tutor in the Memoly mobile app to get started</p>
        </div>
      )}

      {!loading && !error && avatars.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
          {avatars.map((avatar) => (
            <AvatarCard key={avatar.id} avatar={avatar} />
          ))}
        </div>
      )}
    </div>
  );
}
